# Nutrition Facts Scanner Design

## 1. Overview
This document outlines the design for a Nutrition Facts Scanner feature within the mobile application. The goal is to allow users to quickly log food items by scanning nutrition labels or barcodes using their device's camera.

**Key Constraints:**
- Use only **free APIs**.
- Use **computer vision libraries** (preferably on-device) to avoid cloud costs and latency.

## 2. Architecture

The system will rely on **On-Device Optical Character Recognition (OCR)** for label scanning and the **OpenFoodFacts API** for barcode lookup.

### High-Level Data Flow

1.  **Input**: User points camera at Nutrition Facts label.
2.  **Capture**: Image is captured (or frame processed in real-time).
3.  **Pre-processing**: Image is cropped to the relevant region (Region of Interest).
4.  **OCR**: Text is extracted from the image using an on-device ML library.
5.  **Parsing**: Raw text is parsed into structured data (Calories, Fat, Protein, Carbs).
6.  **Validation**: User reviews and edits the extracted values.
7.  **Storage**: Data is saved as a new Food Item or Daily Log entry.

## 3. Technology Stack

### 3.1. Camera & Image Capture
-   **Library**: `expo-camera`
-   **Justification**: Native Expo module, supports easy integration with the React Native view hierarchy.
-   **Features**: Auto-focus, flash control, and frame processing capabilities.

### 3.2. Computer Vision / OCR
-   **Library**: `@react-native-ml-kit/text-recognition` (or `react-native-mlkit-ocr`)
-   **Underlying Tech**: Google ML Kit (Text Recognition v2).
-   **Cost**: **Free** (On-device).
-   **Privacy**: Images are processed locally; no data is sent to the cloud.
-   **Justification**: Superior accuracy compared to Tesseract.js for mobile, faster than cloud APIs, and works offline.

### 3.3. External Data APIs (Enrichment/Fallback)
-   **API**: **OpenFoodFacts**
-   **Cost**: **Free** (Open Database).
-   **Usage**: 
    -   Primary: Barcode scanning (if the user scans a UPC).
    -   Secondary: Validating scanned product names if detected.

## 4. Detailed Design

### 4.1. User Interface
-   **Camera View**: Full-screen camera preview.
-   **Overlay**: A semi-transparent overlay with a clear rectangular "guide box" to indicate where the user should position the nutrition label.
-   **Controls**: Shutter button (for high-res capture) or "Scan" toggle (for continuous frame processing).

### 4.2. Image Processing Pipeline
1.  **Capture**: 
    -   User aligns label in box.
    -   App captures 1080p+ image.
2.  **Cropping (Optional but Recommended)**:
    -   Use `expo-image-manipulator` to crop the image to the overlay coordinates to reduce noise and processing time.
3.  **Text Extraction**:
    -   Pass the image URI to the ML Kit Text Recognition module.
    -   Receive a list of text blocks with bounding coordinates.

### 4.3. Parsing Logic (The "Brain")
Raw OCR text comes in unstructured blocks. We need a robust heuristic parser.

**Strategy:**
1.  **Normalization**: Convert all text to lowercase, remove common OCR errors (e.g., 'l' -> '1', 'O' -> '0' in numeric contexts).
2.  **Keyword Anchoring**: Search for standard FDA label keywords:
    -   `"calories"`, `"energy"`
    -   `"total fat"`, `"fat"`
    -   `"protein"`
    -   `"carbohydrate"`, `"total carb"`
    -   `"sugar"`, `"sodium"`
3.  **Proximity Search**:
    -   Find the number closest to the keyword on the same line (y-coordinate) or immediate right (x-coordinate).
    -   Use Regex: `/(calories|protein|fat)\s*:?\s*(\d+(?:\.\d+)?)\s*(g|mg|kcal)?/i`
4.  **Sanity Check**:
    -   Ensure `Total Fat + Carbs + Protein` roughly correlates to `Calories` (4-4-9 rule) to flag obvious OCR errors.

### 4.4. Parsing Example
**Input (OCR Output):**
```
Nutrition Facts
Serving Size 1 cup
Amount Per Serving
Calories 230
Total Fat 8g
Total Carbohydrate 37g
Protein 3g
```

**Extracted Data:**
-   `calories`: 230
-   `fat`: 8 (unit: g)
-   `carbs`: 37 (unit: g)
-   `protein`: 3 (unit: g)

## 5. Implementation Steps

1.  **Dependencies**:
    -   Install `expo-camera`, `expo-image-manipulator`, `@react-native-ml-kit/text-recognition`.
    -   *Note: Using native modules requires a Development Build (`npx expo run:android` / `run:ios`), not Expo Go.*

2.  **Prototype**:
    -   Build a simple screen that takes a photo and dumps raw text to the console.

3.  **Parser Development**:
    -   Create a unit-tested utility `parseNutritionLabel(text: string): NutritionData`.
    -   Test with various sample label images.

4.  **Integration**:
    -   Connect Camera -> OCR -> Parser -> `EditFoodScreen`.

## 6. Testing Strategy

To ensure robust OCR parsing across different label formats (US, EU, various fonts/sizes), a dedicated testing repository/harness is required.

### 6.1. Test Repository Structure
Create a dedicated folder (e.g., `apps/mobile/__tests__/fixtures/ocr`) containing:
1.  **Sample Images**: A diverse collection of nutrition label photos (high/low quality, different angles).
2.  **Expected Outputs**: JSON files matching the image filenames, containing the ground-truth data.

**Structure Example:**
```
/apps/mobile/__tests__/fixtures/ocr/
  ├── label_001.jpg          # Raw image
  ├── label_001.json         # Expected parsed data
  ├── label_002_tilted.jpg
  ├── label_002_tilted.json
  └── ...
```

### 6.2. Expected Output Format (JSON)
Each test case should define the expected extracted values:
```json
{
  "calories": 230,
  "protein": 3,
  "totalFat": 8,
  "totalCarbohydrate": 37,
  "servingSize": "1 cup",
  "meta": {
      "confidence": "high",
      "region": "US"
  }
}
```

### 6.3. Automated Testing Workflow
1.  **Mocking OCR**: Since ML Kit runs on-device, unit tests should mock the OCR output string.
2.  **Integration Tests**:
    -   Load the sample image (or its mock text representation).
    -   Run `parseNutritionLabel()`.
    -   Compare result against the corresponding JSON file.
    -   Fail if accuracy is below a certain threshold (e.g., critical fields like Calories must match exactly).

## 7. Risks & Mitigations

| Risk | Mitigation |
| :--- | :--- |
| **OCR Accuracy** | Allow users to manually edit values after scanning. Highlight "low confidence" fields. |
| **Non-Standard Labels** | Support common formats (US, EU). Fallback to manual entry if parsing fails completely. |
| **Lighting/Blur** | Check image sharpness before processing (if possible) or guide user to hold phone steady. |
| **App Size** | ML Kit is bundled with the OS (Android) or relatively small static lib (iOS), keeping app size manageable. |

## 8. Future Enhancements
-   **Real-time AR**: Overlay recognized numbers directly on the camera feed (using VisionCamera).
-   **Barcode Integration**: Detect barcodes in the same view and auto-query OpenFoodFacts.
