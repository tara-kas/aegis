/**
 * Medical device registry mapping LOINC vital-sign codes to the real
 * monitoring hardware deployed in a typical European OR suite.
 *
 * Devices chosen are CE-marked, MDR-compliant systems from manufacturers
 * with established install bases across NHS, Charité, AP-HP, etc.
 */

export interface MedicalDevice {
  id: string;
  manufacturer: string;
  model: string;
  type: string;
  ceMarkClass: string;
}

const DEVICES: Record<string, MedicalDevice> = {
  // Philips IntelliVue MX800 — multi-parameter bedside monitor
  '8867-4': {
    id: 'PHI-MX800-EU-4781',
    manufacturer: 'Philips Healthcare',
    model: 'IntelliVue MX800',
    type: 'Multi-parameter patient monitor',
    ceMarkClass: 'IIb',
  },
  // Masimo Radical-7 — pulse oximetry via Philips integration module
  '2708-6': {
    id: 'MAS-R7-EU-1129',
    manufacturer: 'Masimo Corporation',
    model: 'Radical-7 Pulse CO-Oximeter',
    type: 'Pulse oximeter (SET technology)',
    ceMarkClass: 'IIb',
  },
  // Dräger Infinity Delta — haemodynamic monitor (systolic)
  '8480-6': {
    id: 'DRG-IDELTA-EU-3356',
    manufacturer: 'Drägerwerk AG',
    model: 'Infinity Delta',
    type: 'Haemodynamic monitor (NIBP)',
    ceMarkClass: 'IIb',
  },
  // Dräger Infinity Delta — diastolic channel
  '8462-4': {
    id: 'DRG-IDELTA-EU-3356',
    manufacturer: 'Drägerwerk AG',
    model: 'Infinity Delta',
    type: 'Haemodynamic monitor (NIBP)',
    ceMarkClass: 'IIb',
  },
  // Dräger Vamos Plus — mainstream capnography
  '19889-5': {
    id: 'DRG-VAMOS-EU-5502',
    manufacturer: 'Drägerwerk AG',
    model: 'Vamos Plus',
    type: 'Mainstream capnograph (EtCO₂)',
    ceMarkClass: 'IIb',
  },
  // GE Healthcare CARESCAPE R860 — ventilator with resp-rate channel
  '9279-1': {
    id: 'GE-R860-EU-7894',
    manufacturer: 'GE HealthCare',
    model: 'CARESCAPE R860',
    type: 'Anaesthesia ventilator',
    ceMarkClass: 'IIb',
  },
  // 3M Bair Hugger — oesophageal/nasopharyngeal core temperature probe
  '8310-5': {
    id: '3M-BH775-EU-2041',
    manufacturer: '3M / Solventum',
    model: 'Bair Hugger Model 775',
    type: 'Core temperature monitoring system',
    ceMarkClass: 'IIa',
  },
};

const ROBOTIC_DEVICE: MedicalDevice = {
  id: 'CMR-VERS-EU-0093',
  manufacturer: 'CMR Surgical',
  model: 'Versius Surgical Robotic System',
  type: '6-axis minimal-access surgical robot',
  ceMarkClass: 'IIb',
};

export function getDeviceForVital(loincCode: string): MedicalDevice | undefined {
  return DEVICES[loincCode];
}

export function getRoboticDevice(): MedicalDevice {
  return ROBOTIC_DEVICE;
}
