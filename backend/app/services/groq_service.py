"""Groq API service for text analysis"""
from typing import Dict, Any
from groq import Groq
from app.config import settings
import logging
import json
import re
import hashlib
import asyncio
from app.services.cache_service import get_cache, set_cache

logger = logging.getLogger(__name__)

class GroqService:
    """Service for analyzing documents with Groq API (Llama model)"""
    
    # Model to use
    MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"
    
    def __init__(self):
        """Initialize Groq service"""
        if not settings.GROQ_API_KEY:
            raise ValueError("GROQ_API_KEY is not configured. Please set it in environment variables.")
        
        self.client = Groq(api_key=settings.GROQ_API_KEY)
        
    async def analyze_document(
        self, 
        text: str, 
        url: str, 
        doc_type: str
    ) -> Dict[str, Any]:
        """
        Analyze a document using Groq API with caching
        
        Args:
            text: Document text to analyze
            url: Document URL
            doc_type: Type of document (privacy_policy, terms_of_service, etc.)
        
        Returns:
            Dictionary with analysis results:
            - summary_100_words: 100-word summary
            - summary_one_sentence: One-sentence summary
            - word_frequency: Top 50 word frequency stats
            - measurements: 10 text mining measurements
        """
        try:
            # Generate cache key from URL and text hash
            text_hash = hashlib.md5(text.encode()).hexdigest()
            cache_key = f"analysis:{url}:{text_hash}"
            
            # Check cache first
            cached_result = get_cache(cache_key)
            if cached_result:
                logger.info(f"Cache HIT for {url}")
                return cached_result
            
            logger.info(f"Cache MISS for {url}, analyzing with Groq API (Llama)...")
            
            # Prepare prompt
            prompt = self._create_analysis_prompt(text, url, doc_type)
            
            # Retry logic
            max_retries = 10
            last_exception = None
            
            for attempt in range(max_retries):
                try:
                    # Call Groq API
                    chat_completion = self.client.chat.completions.create(
                        model=self.MODEL,
                        messages=[
                            {
                                "role": "system",
                                "content": "You are a legal document analyst. Always respond with valid JSON only, no markdown formatting."
                            },
                            {
                                "role": "user",
                                "content": prompt
                            }
                        ],
                        temperature=0.3,  # Lower temperature for more consistent JSON output
                        max_tokens=2000,
                        response_format={"type": "json_object"}  # Force JSON output
                    )
                    
                    # Get response
                    response_text = chat_completion.choices[0].message.content
                    
                    # Parse response
                    result = self._parse_response(response_text, text)
                    
                    # Store in cache (30 days)
                    set_cache(cache_key, result, ttl=2592000)
                    
                    logger.info(f"Successfully analyzed and cached document {url} with Groq")
                    return result
                except Exception as e:
                    last_exception = e
                    logger.warning(f"Groq API attempt {attempt + 1}/{max_retries} failed: {e}")
                    if attempt < max_retries - 1:
                        await asyncio.sleep(2 * (attempt + 1))  # Backoff: 2s, 4s
            
            # If all attempts fail, raise the last exception
            if last_exception:
                raise last_exception
            
        except Exception as e:
            logger.error(f"Error analyzing document with Groq: {e}")
            # Re-raise exception - let caller handle fallback
            raise
    
    async def compare_documents(
        self,
        old_text: str,
        new_text: str,
        doc_type: str
    ) -> Dict[str, Any]:
        """
        Compare two versions of a document using Groq API to identify changes and risks
        """
        try:
            # Generate cache key from hashes of both documents
            old_hash = hashlib.md5(old_text.encode()).hexdigest()
            new_hash = hashlib.md5(new_text.encode()).hexdigest()
            cache_key = f"comparison:{doc_type}:{old_hash}:{new_hash}"

            # Check cache
            cached_result = get_cache(cache_key)
            if cached_result:
                logger.info(f"Cache HIT for comparison {cache_key}")
                print(f"Cache HIT for comparison {cache_key}")
                return cached_result

            logger.info(f"Analyzing changes between versions for {doc_type}...")
            print(f"Analyzing changes between versions for {doc_type}...")

            prompt = self._create_comparison_prompt(old_text, new_text, doc_type)

            max_retries = 10
            last_exception = None

            for attempt in range(max_retries):
                try:
                    chat_completion = self.client.chat.completions.create(
                        model=self.MODEL,
                        messages=[
                            {"role": "system", "content": "You are a legal document analyst. specialized in tracking changes in contracts. Always respond with valid JSON only."},
                            {"role": "user", "content": prompt}
                        ],
                        temperature=0.2,
                        max_tokens=2000,
                        response_format={"type": "json_object"}
                    )
                    response_text = chat_completion.choices[0].message.content
                    result = self._parse_comparison_response(response_text)
                    
                    set_cache(cache_key, result, ttl=settings.CACHE_TTL_COMPARISON)
                    return result
                except Exception as e:
                    last_exception = e
                    if attempt < max_retries - 1:
                        await asyncio.sleep(2 * (attempt + 1))
            
            if last_exception:
                raise last_exception

        except Exception as e:
            logger.error(f"Error comparing documents: {e}")
            print(f"Error comparing documents: {e}")
            raise

    def _create_analysis_prompt(self, text: str, url: str, doc_type: str) -> str:
        """Create analysis prompt for Groq"""
        # Limit text to 50K chars
        text_preview = text[:50000] if len(text) > 50000 else text
        
        prompt = f"""Please analyze the following {doc_type} document and provide a comprehensive analysis in JSON format.

Document URL: {url}
Document Type: {doc_type}

IMPORTANT: Respond with ONLY a JSON object (no markdown, no code blocks, no explanations) with the following structure:
{{
    "summary_100_words": "A concise 100-word summary of the key points...",
    "summary_one_sentence": "A one-sentence summary of the entire document.",
    "word_frequency": {{
        "word1": count1,
        "word2": count2,
        ...
    }},
    "measurements": {{
        "word_count": <number>,
        "sentence_count": <number>,
        "average_words_per_sentence": <number>,
        "flesch_reading_ease": <number>,
        "flesch_kincaid_grade": <number>,
        "automated_readability_index": <number>,
        "sentiment_score": <number between -1 and 1>,
        "keyword_density": <percentage>,
        "legal_clause_count": <number>,
        "risk_indicator_score": <number between 0 and 100>
    }},
    "nutrition_label": {{
        "opt_out_available": "Yes/No/Partial/Not Specified",
        "data_sharing": "Yes/No/Partial/Not Specified",
        "data_retention": "How long data is retained/Not Specified",
        "can_user_request_deletion": "Yes/No/Partial/Not Specified",
        "third_party_sharing": "Yes/No/Partial/Not Specified",
        "data_broker_sharing": "Yes/No/Partial/Not Specified",
        "cross_device_tracking": "Yes/No/Partial/Not Specified",
        "collection_purpose": "Primary reasons for data collection in four words or less/Not Specified",
        "microphone_access": "Yes/No/Partial/Not Specified",
        "camera_access": "Yes/No/Partial/Not Specified"
    }}
}}

Document Text:
{text_preview}"""
        return prompt

    def _create_comparison_prompt(self, old_text: str, new_text: str, doc_type: str) -> str:
        """Create prompt for comparing two document versions"""
        limit = 15000
        old_preview = old_text[:limit]
        new_preview = new_text[:limit]

        return f"""Compare the following two versions of a {doc_type} and identify significant legal or privacy changes.

OLD VERSION (Truncated):
{old_preview}

NEW VERSION (Truncated):
{new_preview}

IMPORTANT: Respond with ONLY a JSON object with this structure:
{{
    "change_description": "Concise summary of what changed between these versions",
    "analysis_summary": "A summary of the key points in the NEW version",
    "risk_level_of_changes": "LOW",
    "key_changes": [
        {{ "category": "Data Collection", "description": "Description of change", "impact": "Impact on user" }}
    ]
}}"""
    
    def _parse_response(self, response_text: str, original_text: str) -> Dict[str, Any]:
        """Parse Groq response into structured format"""
        try:
            # Try to extract JSON from response
            # Remove markdown code blocks if present
            text = response_text.strip()
            if text.startswith("```json"):
                text = text[7:]  # Remove ```json
            if text.startswith("```"):
                text = text[3:]  # Remove ```
            if text.endswith("```"):
                text = text[:-3]  # Remove closing ```
            
            # Parse JSON
            result = json.loads(text.strip())
            
            # Validate and add fallback values for measurements
            if "measurements" not in result:
                result["measurements"] = {}
            
            # Calculate basic text stats if missing
            measurements = result["measurements"]
            word_count = len(original_text.split())
            sentence_count = len(re.findall(r'[.!?]+', original_text))
            
            measurements.setdefault("word_count", word_count)
            measurements.setdefault("sentence_count", sentence_count)
            measurements.setdefault("average_words_per_sentence", 
                                   round(word_count / max(sentence_count, 1), 2))
            
            # Ensure all required fields exist
            result.setdefault("summary_100_words", "Analysis pending...")
            result.setdefault("summary_one_sentence", "Analysis pending...")
            result.setdefault("word_frequency", {})
            result.setdefault("nutrition_label", {
                "opt_out_available": "Not Specified",
                "data_sharing": "Not Specified",
                "data_retention": "Not Specified",
                "can_user_request_deletion": "Not Specified",
                "third_party_sharing": "Not Specified",
                "data_broker_sharing": "Not Specified",
                "cross_device_tracking": "Not Specified",
                "collection_purpose": "Not Specified",
                "microphone_access": "Not Specified",
                "camera_access": "Not Specified"
            })
            
            return result
            
        except json.JSONDecodeError as e:
            logger.error(f"Error parsing Groq response: {e}")
            # Try regex extraction as fallback
            return self._regex_parse_response(response_text, original_text)
    
    def _parse_comparison_response(self, response_text: str) -> Dict[str, Any]:
        """Parse comparison response"""
        try:
            text = response_text.strip()
            if text.startswith("```json"): text = text[7:]
            if text.startswith("```"): text = text[3:]
            if text.endswith("```"): text = text[:-3]
            
            return json.loads(text.strip())
        except json.JSONDecodeError:
            logger.error("Failed to parse comparison JSON")
            print("Failed to parse comparison JSON")
            return {
                "change_description": "Analysis failed to parse.",
                "analysis_summary": "Summary unavailable due to parsing error.",
                "risk_level_of_changes": "UNKNOWN",
                "key_changes": []
            }

    def _regex_parse_response(self, response_text: str, original_text: str) -> Dict[str, Any]:
        """Fallback regex parsing if JSON parsing fails"""
        # Calculate basic stats from original text
        word_count = len(original_text.split())
        sentence_count = len(re.findall(r'[.!?]+', original_text))
        
        return {
            "summary_100_words": self._extract_summary(response_text),
            "summary_one_sentence": self._extract_one_sentence(response_text),
            "word_frequency": {},
            "measurements": {
                "word_count": word_count,
                "sentence_count": sentence_count,
                "average_words_per_sentence": round(word_count / max(sentence_count, 1), 2),
                "flesch_reading_ease": 0,
                "flesch_kincaid_grade": 0,
                "automated_readability_index": 0,
                "sentiment_score": 0,
                "keyword_density": 0,
                "legal_clause_count": 0,
                "risk_indicator_score": 50
            },
            "nutrition_label": {
                "opt_out_available": "Not Specified",
                "data_sharing": "Not Specified",
                "data_retention": "Not Specified",
                "can_user_request_deletion": "Not Specified",
                "third_party_sharing": "Not Specified",
                "data_broker_sharing": "Not Specified",
                "cross_device_tracking": "Not Specified",
                "collection_purpose": "Not Specified",
                "microphone_access": "Not Specified",
                "camera_access": "Not Specified"
            }
        }
    
    def _extract_summary(self, text: str) -> str:
        """Extract 100-word summary from response"""
        # Look for summary section
        summary_match = re.search(
            r'summary[:\s]*["\']([^"\']{100,500})["\']',
            text,
            re.IGNORECASE
        )
        if summary_match:
            return summary_match.group(1)
        return "Summary extracted from analysis."
    
    def _extract_one_sentence(self, text: str) -> str:
        """Extract one-sentence summary from response"""
        # Look for one-sentence summary
        sentence_match = re.search(
            r'one.sentence[:\s]*["\']([^"\']{20,300})["\']',
            text,
            re.IGNORECASE
        )
        if sentence_match:
            return sentence_match.group(1)
        return "Document analysis completed."
