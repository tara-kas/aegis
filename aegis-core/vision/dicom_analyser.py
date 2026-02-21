"""
MedSigLIP vision module for DICOM image analysis.
Runs fully locally via Hugging Face. No API key needed.
"""

import json
import uuid
from datetime import datetime, timezone
from typing import Dict, List
import numpy as np
from PIL import Image
import pydicom
from transformers import AutoModel, AutoProcessor
import torch

from config import SUPABASE_URL, SUPABASE_ANON_KEY


class DICOMAnalyser:
    """DICOM image analyser using MedSigLIP model."""
    
    def __init__(self):
        """Initialize MedSigLIP model and processor."""
        model_name = "google/medsigLIP"
        print(f"[VISION] Loading MedSigLIP model: {model_name}")
        
        self.processor = AutoProcessor.from_pretrained(model_name)
        self.model = AutoModel.from_pretrained(model_name)
        self.model.eval()
        
        # Classification labels
        self.labels = [
            "healthy tissue",
            "tumour mass",
            "surgical instrument",
            "anatomical landmark",
            "haemorrhage",
            "normal anatomy"
        ]
        
        self.log_file = "logs/vision.jsonl"
    
    def read_dicom(self, dicom_path: str) -> Image.Image:
        """
        Read DICOM file and convert to PIL Image.
        
        Args:
            dicom_path: Path to DICOM file
            
        Returns:
            PIL Image normalized to 0-255
        """
        ds = pydicom.dcmread(dicom_path)
        
        # Extract pixel array
        pixel_array = ds.pixel_array
        
        # Normalize to 0-255
        if pixel_array.dtype != np.uint8:
            # Normalize based on data type
            if pixel_array.max() > 255:
                # 16-bit image
                pixel_array = ((pixel_array - pixel_array.min()) / 
                             (pixel_array.max() - pixel_array.min()) * 255).astype(np.uint8)
            else:
                pixel_array = pixel_array.astype(np.uint8)
        
        # Convert to PIL Image
        image = Image.fromarray(pixel_array)
        
        return image
    
    def classify(self, image: Image.Image) -> Dict:
        """
        Zero-shot classification of medical image.
        
        Args:
            image: PIL Image
            
        Returns:
            Dictionary with classification results and FHIR Observation
        """
        # Prepare inputs
        inputs = self.processor(
            text=self.labels,
            images=image,
            return_tensors="pt",
            padding=True
        )
        
        # Run inference
        with torch.no_grad():
            outputs = self.model(**inputs)
        
        # Get logits and compute probabilities
        logits = outputs.logits_per_image
        probs = torch.nn.functional.softmax(logits, dim=-1)
        
        # Get top prediction
        top_idx = probs.argmax().item()
        top_label = self.labels[top_idx]
        confidence = probs[0][top_idx].item()
        
        # Build all scores dictionary
        all_scores = {
            label: probs[0][i].item()
            for i, label in enumerate(self.labels)
        }
        
        # Create FHIR Observation resource
        fhir_observation = self._create_fhir_observation(top_label, confidence)
        
        result = {
            "top_label": top_label,
            "confidence": confidence,
            "all_scores": all_scores,
            "fhir_observation": fhir_observation
        }
        
        # Log result
        self._log_result(result)
        
        return result
    
    def _create_fhir_observation(self, label: str, confidence: float) -> Dict:
        """
        Create FHIR R4 Observation resource per fhir_standards.mdc.
        
        Args:
            label: Classification label
            confidence: Confidence score
            
        Returns:
            Complete FHIR R4 Observation resource
        """
        # Map labels to SNOMED CT codes
        snomed_mapping = {
            "healthy tissue": {
                "code": "17621005",
                "display": "Normal tissue structure"
            },
            "tumour mass": {
                "code": "126906006",
                "display": "Neoplasm"
            },
            "surgical instrument": {
                "code": "46866001",
                "display": "Surgical instrument"
            },
            "anatomical landmark": {
                "code": "91723000",
                "display": "Anatomical structure"
            },
            "haemorrhage": {
                "code": "50960005",
                "display": "Hemorrhage"
            },
            "normal anatomy": {
                "code": "91723000",
                "display": "Normal anatomical structure"
            }
        }
        
        snomed = snomed_mapping.get(label, {
            "code": "394718007",
            "display": "Clinical finding"
        })
        
        observation = {
            "resourceType": "Observation",
            "id": str(uuid.uuid4()),
            "status": "preliminary",
            "code": {
                "coding": [
                    {
                        "system": "http://snomed.info/sct",
                        "code": snomed["code"],
                        "display": snomed["display"]
                    }
                ],
                "text": f"MedSigLIP classification: {label}"
            },
            "valueCodeableConcept": {
                "coding": [
                    {
                        "system": "http://snomed.info/sct",
                        "code": snomed["code"],
                        "display": snomed["display"]
                    }
                ],
                "text": label
            },
            "component": [
                {
                    "code": {
                        "coding": [
                            {
                                "system": "http://loinc.org",
                                "code": "33747-0",
                                "display": "Confidence score"
                            }
                        ],
                        "text": "Classification confidence"
                    },
                    "valueQuantity": {
                        "value": confidence,
                        "unit": "1",
                        "system": "http://unitsofmeasure.org",
                        "code": "{score}"
                    }
                }
            ],
            "effectiveDateTime": datetime.now(timezone.utc).isoformat(),
            "issued": datetime.now(timezone.utc).isoformat()
        }
        
        return observation
    
    def _log_result(self, result: Dict):
        """Append result to logs/vision.jsonl."""
        try:
            log_entry = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                **result
            }
            with open(self.log_file, "a") as f:
                f.write(json.dumps(log_entry) + "\n")
        except Exception as e:
            print(f"[ERROR] Failed to write vision log: {e}")
    
    def analyse_dicom(self, dicom_path: str) -> Dict:
        """
        Complete pipeline: read DICOM and classify.
        
        Args:
            dicom_path: Path to DICOM file
            
        Returns:
            Classification result with FHIR Observation
        """
        image = self.read_dicom(dicom_path)
        return self.classify(image)


if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python dicom_analyser.py <dicom_file_path>")
        sys.exit(1)
    
    analyser = DICOMAnalyser()
    result = analyser.analyse_dicom(sys.argv[1])
    print(json.dumps(result, indent=2))
