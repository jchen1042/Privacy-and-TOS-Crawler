import asyncio
import logging
import random
from datetime import datetime, timezone
from sqlalchemy import func
from app.database.base import SessionLocal
from app.config import settings
from app.services.global_analysis_service import GlobalAnalysisService
from app.services.global_document_service import GlobalDocumentService
from app.services.crawler_service import CrawlerService
from app.services.groq_service import GroqService
from app.models.document_version import DocumentVersion
from celery.schedules import crontab
from celery import Celery

logger = logging.getLogger(__name__)

# Initialize Celery using Redis environment
celery_app = Celery('monitoring', broker=settings.REDIS_URL)

# Upstash/Serverless specific configurations
celery_conf = {
    'broker_connection_retry_on_startup': True,
    'worker_prefetch_multiplier': 1,  # Don't hoard tasks, better for serverless/cloud environments
    'broker_transport_options': {
        'visibility_timeout': 3600,  # 1 hour
    }
}

if settings.REDIS_URL.startswith('rediss://'):
    celery_conf['broker_use_ssl'] = {'ssl_cert_reqs': None}
    celery_conf['redis_backend_use_ssl'] = {'ssl_cert_reqs': None}

celery_app.conf.update(celery_conf)

# Configure the schedule
celery_app.conf.beat_schedule = {
    'run-monitoring-every-6-hours': {
        'task': 'tasks.monitoring.run_monitoring_cycle',
        'schedule': crontab(minute=0, hour='*/6'), # Runs every 6 hours
        #'schedule': crontab(minute='*'), # UNCOMMENT for testing
        'args': (20,) # Check 20 stale URLs per cycle
    },
}

@celery_app.task(name="tasks.monitoring.run_monitoring_cycle")
def run_monitoring_cycle_task(batch_limit: int = 10):
    """Celery wrapper for the monitoring cycle"""
    # Celery tasks are synchronous wrappers for the async logic
    return asyncio.run(run_monitoring_cycle(batch_limit))

async def run_monitoring_cycle(batch_limit: int = 10):
    """
    Iterates through monitored documents that haven't been checked recently,
    fetches live content, and updates the global cache if changes are detected.
    """
    db = SessionLocal()
    try:
        # Fetch stale documents (e.g., checked more than 24 hours ago)
        # limit the batch size to avoid overwhelming the system
        stale_docs = GlobalAnalysisService.get_stale_monitored_urls(db, older_than_hours=24, limit=batch_limit)
        
        if not stale_docs:
            logger.info("Monitoring: No stale documents to check.")
            return

        logger.info(f"Monitoring: Checking {len(stale_docs)} URLs for updates.")
        
        groq_service = GroqService()
        
        async with CrawlerService() as crawler:
            for analysis_result in stale_docs:
                # Add a small random delay (2-5s) between requests to avoid 
                # burst-pattern bot detection.
                await asyncio.sleep(random.uniform(2.0, 5.0))
                
                try:
                    g_doc = analysis_result.global_document
                    logger.info(f"Monitoring: Fetching live content for {analysis_result.document_url}")
                    
                    # Fetch live content for the URL
                    live_doc_data = await crawler._process_single_document(
                        analysis_result.document_url, 
                        g_doc.document_type
                    )
                    
                    if not live_doc_data:
                        logger.warning(f"Monitoring: Failed to fetch {analysis_result.document_url}")
                        continue

                    # Text Hash Analysis
                    if live_doc_data['text_hash'] == analysis_result.text_hash:
                        # No change detected - update only the check timestamp (heartbeat)
                        analysis_result.last_automated_check = func.now()
                        db.commit()
                        logger.info(f"Monitoring: No change for {analysis_result.document_url}")
                    else:
                        # CHANGE DETECTED!
                        logger.info(f"Monitoring: Change detected in {analysis_result.document_url}. Triggering AI analysis.")
                        
                        # Perform AI comparison and analysis
                        # We reuse the compare_documents logic to get the delta for the version history
                        change_analysis = await groq_service.compare_documents(
                            old_text=g_doc.raw_text,
                            new_text=live_doc_data['raw_text'],
                            doc_type=g_doc.document_type
                        )
                        
                        new_analysis_data = await groq_service.analyze_document(
                            text=live_doc_data['raw_text'],
                            url=live_doc_data['url'],
                            doc_type=live_doc_data['document_type']
                        )

                        # Update the GlobalDocument Source of Truth
                        updated_g_doc = GlobalDocumentService.store_document(
                            db=db,
                            document_url=live_doc_data['url'],
                            document_type=live_doc_data['document_type'],
                            raw_text=live_doc_data['raw_text'],
                            base_url=g_doc.base_url,
                            title=live_doc_data['title'],
                            word_count=live_doc_data['word_count']
                        )
                        
                        # Ensure changes found via automation are recorded in the 
                        # version history, otherwise the 'History' UI will be out of sync.
                        document_version = DocumentVersion(
                            global_document_id=updated_g_doc.id,
                            raw_text=live_doc_data['raw_text'],
                            text_hash=live_doc_data['text_hash'],
                            word_count=live_doc_data['word_count'],
                            change_description=change_analysis.get('change_description'),
                            analysis_summary=change_analysis.get('analysis_summary'),
                            version_number=updated_g_doc.version
                        )
                        db.add(document_version)
                        db.flush()

                        # Store the refreshed analysis (this handles last_automated_check internally now)
                        GlobalAnalysisService.store_analysis(
                            db=db,
                            global_document_id=updated_g_doc.id,
                            document_url=live_doc_data['url'],
                            text_hash=live_doc_data['text_hash'],
                            analysis_data=new_analysis_data,
                            force_replace=True
                        )
                        logger.info(f"Monitoring: Successfully updated document and analysis for {analysis_result.document_url}")

                except Exception as e:
                    logger.error(f"Monitoring: Error processing {analysis_result.document_url}: {e}")
                    db.rollback()
                    continue
    finally:
        db.close()
