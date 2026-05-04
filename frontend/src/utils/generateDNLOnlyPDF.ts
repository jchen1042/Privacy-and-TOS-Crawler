import jsPDF from 'jspdf';
import { AnalysisResult, Document, NutritionLabelData } from '@/types';

// Mapping for Nutrition Label keys to human-readable text
const nutritionLabelMap: { [key: string]: string } = {
  opt_out_available: "Opt-out Available",
  data_sharing: "General Sharing",
  data_retention: "Retention Period",
  can_user_request_deletion: "Request Deletion",
  third_party_sharing: "Third-party Sharing",
  data_broker_sharing: "Data Brokers",
  cross_device_tracking: "Cross-device Tracking",
  collection_purpose: "Collection Purpose",
  microphone_access: "Microphone Access",
  camera_access: "Camera Access",
  local_storage_access: "Local Storage",
  user_contacts_access: "Contacts Access",
  location_access: "Location Access",
  biometric_data_access: "Biometric Access",
  health_data_access: "Health Data Access",
  data_transmission_frequency: "Transmission",
  account_deletion_allowed: "Account Deletion",
  internet_required: "Internet Required",
  includes_reccurring_charges: "Recurring Charges"
};

// Define categories and their items for the Nutrition Label
const nutritionLabelCategories: { [category: string]: (keyof NutritionLabelData)[] } = {
  "Data Access & Tracking": [
    "camera_access",
    "microphone_access",
    "location_access",
    "biometric_data_access",
    "health_data_access",
    "user_contacts_access",
    "local_storage_access",
    "cross_device_tracking",
    "data_transmission_frequency",
  ],
  "Data Sharing": [
    "data_sharing",
    "third_party_sharing",
    "data_broker_sharing",
  ],
  "User Control": [
    "opt_out_available",
    "can_user_request_deletion",
    "account_deletion_allowed",
  ],
  "Service Requirements": [
    "internet_required",
    "includes_reccurring_charges",
  ],
  "Policy Insights": [
    "data_retention",
    "collection_purpose",
  ],
};

interface DNLData {
  analysis: AnalysisResult;
  document: Document;
}

export const generateDNLOnlyPDF = (data: DNLData): void => {
  const { analysis, document } = data;

  if (!analysis.nutrition_label || Object.keys(analysis.nutrition_label).length === 0) {
    console.warn("No nutrition label data available to generate PDF.");
    return;
  }

  const doc = new jsPDF();
  let yPosition = 20; // Starting Y position for the label content

  const labelWidth = 120; // Horizontal width of the DNL graphic
  const labelX = (210 - labelWidth) / 2; // Center the label on an A4 page (210mm wide)
  const labelY = yPosition;
  let currentLabelY = labelY;

  // Header
  doc.setFontSize(20);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.setFont("helvetica", "bold");
  doc.text("Digital Nutrition Facts", labelX + 2, currentLabelY + 10);
  currentLabelY += 16;

  // Add Document Title
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Document: ${document.title || 'N/A'}`, labelX + 2, currentLabelY);
  currentLabelY += 6;

  // Add Last Updated Date
  doc.text(`Last Updated: ${new Date(document.updated_at || analysis.created_at).toLocaleDateString()}`, labelX + 2, currentLabelY);
  currentLabelY += 8;

  // Thick line below header
  doc.setLineWidth(1.5);
  doc.line(labelX, currentLabelY, labelX + labelWidth, currentLabelY);
  currentLabelY += 10;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");

  // Iterate through categories
  for (const categoryName of Object.keys(nutritionLabelCategories)) {
    const categoryItems = nutritionLabelCategories[categoryName];
    let hasItemsInCategory = false;

    for (const key of categoryItems) {
      const value = analysis.nutrition_label[key];
      if (value !== undefined && value !== null && value !== "") {
        hasItemsInCategory = true;
        break;
      }
    }

    if (hasItemsInCategory) {
      // Check for page break before adding category header
      if (currentLabelY + 15 > doc.internal.pageSize.height - 20) {
        doc.addPage();
        currentLabelY = 20;
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.5);
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text("Digital Nutrition Facts (cont.)", labelX + 2, currentLabelY + 10);
        currentLabelY += 12;
        doc.setLineWidth(1.5);
        doc.line(labelX, currentLabelY, labelX + labelWidth, currentLabelY);
        currentLabelY += 8;
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
      }

      // Draw category header
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(categoryName, labelX + 2, currentLabelY);
      currentLabelY += 4;
      doc.setLineWidth(0.75);
      doc.line(labelX + 1, currentLabelY, labelX + labelWidth - 1, currentLabelY);
      currentLabelY += 6;

      // Iterate through items in the current category
      for (const key of categoryItems) {
        const value = analysis.nutrition_label[key];
        if (value !== undefined && value !== null && value !== "") {
          const displayLabel = nutritionLabelMap[key as string] || (key as string);
          const displayValue = String(value);

          // Check for page break before adding metric
          if (currentLabelY + 8 > doc.internal.pageSize.height - 20) {
            doc.addPage();
            currentLabelY = 20;
            doc.setDrawColor(0, 0, 0);
            doc.setLineWidth(0.5);
            doc.setFontSize(18);
            doc.setFont("helvetica", "bold");
            doc.text("Digital Nutrition Facts (cont.)", labelX + 2, currentLabelY + 10);
            currentLabelY += 12;
            doc.setLineWidth(1.5);
            doc.line(labelX, currentLabelY, labelX + labelWidth, currentLabelY);
            currentLabelY += 8;
            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.text(categoryName + " (cont.)", labelX + 2, currentLabelY);
            currentLabelY += 4;
            doc.setLineWidth(0.75);
            doc.line(labelX + 1, currentLabelY, labelX + labelWidth - 1, currentLabelY);
            currentLabelY += 6;
            doc.setFontSize(9);
            doc.setFont("helvetica", "normal");
          }

          doc.setFont("helvetica", "normal");
          doc.text(displayLabel, labelX + 3, currentLabelY);
          doc.setFont("helvetica", "normal");
          doc.text(displayValue, labelX + labelWidth - 3, currentLabelY, { align: "right" });
          
          doc.setLineWidth(0.2);
          doc.line(labelX + 2, currentLabelY + 2, labelX + labelWidth - 2, currentLabelY + 2);
          currentLabelY += 7;
        }
      }
      currentLabelY += 4;
    }
  }

  // Draw the outer rectangle with the correct height
  doc.rect(labelX, labelY, labelWidth, currentLabelY - labelY);

  // Add footer to each page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Page ${i} of ${pageCount} • Generated on ${new Date().toLocaleDateString()}`,
      labelX + labelWidth / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }

  // Generate filename
  const docTypeSlug = document.document_type === 'tos' ? 'tos' : 'privacy';
  const filename = `digital-nutrition-label-${document.title?.replace(/\s/g, '-') || 'document'}.pdf`;
  
  // Save PDF
  doc.save(filename);
};