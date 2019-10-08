const fhirpath = require('fhirpath');
const {find, addExtension, isTrue} = require('./common');


// codes are listed with the modules they are used in
// (B) = Breast Cancer, (C) = Colorectal, (L) = Lung, (P) = Prostate
const fhirPathVariables = {
  primaryCancerConditionCodes: [
    '188151006', // Malignant neoplasm of central part of female breast (disorder),
    '254837009', // Malignant neoplasm of breast (disorder) (B)
    '93761005', // Primary malignant neoplasm of colon (C)
    '109838007', // Overlapping malignant neoplasm of colon (C)
    '363406005', // Malignant tumor of colon (C)
    '94260004', // Secondary malignant neoplasm of colon (C) -- note this is a "secondary" code but is intended to be a primary cancer
    '254637007', // Non-small cell lung cancer (disorder) (L)
    '254632001', // Small cell carcinoma of lung (disorder) (L)
    '424132000', // Non-small cell carcinoma of lung, TNM stage 1 (disorder) (L)
    '425048006', // Non-small cell carcinoma of lung, TNM stage 2 (disorder) (L)
    '422968005', // Non-small cell carcinoma of lung, TNM stage 3 (disorder) (L)
    '423121009', // Non-small cell carcinoma of lung, TNM stage 4 (disorder) (L)
    '67811000119102', // Primary small cell malignant neoplasm of lung, TNM stage 1 (disorder) (L)
    '67821000119109', // Primary small cell malignant neoplasm of lung, TNM stage 2 (disorder) (L)
    '67831000119107', // Primary small cell malignant neoplasm of lung, TNM stage 3 (disorder) (L)
    '67841000119103', // Primary small cell malignant neoplasm of lung, TNM stage 4 (disorder) (L)
    // note that none of the 3 prostate cancer codes are in the recommended VS
    '126906006', // Neoplasm of prostate (P)
    '92691004', // Carcinoma in situ of prostate (disorder) (P)
    '314994000', // Metastasis from malignant tumor of prostate (disorder) (P) -- also a "secondary" code but intended to be a primary cancer
  ],

  surgeryCodes: [
    '396487001', // Sentinel lymph node biopsy (procedure) (B)
    '443497002', // Excision of sentinel lymph node (procedure) (B)
    '234262008', // Excision of axillary lymph node (procedure) (B)
    '392021009', // Lumpectomy of breast (procedure) (B)
    '69031006', // Excision of breast tissue (procedure) (B)
    '387607004', // Construction of diverting colostomy (B)
    '43075005', // Partial resection of colon (B)
    '90470006', // Prostatectomy (P)
  ],

  radiationCodes: [
    '447759004', // Brachytherapy of breast (procedure) (B)
    '384692006', // Intracavitary brachytherapy (procedure) (B)
    '113120007', // Interstitial brachytherapy (procedure) (B)
    '33195004', // Teleradiotherapy procedure (procedure) (B)
    '385798007', // Radiation therapy care (regime/therapy) (B)
    '108290001', // Radiation oncology AND/OR radiotherapy (procedure) (B)
  ],

  tumorMarkerTestCodes: [
    '85319-2', // HER2 [Presence] in Breast cancer specimen by Immune stain (B)
    '85318-4', // HER2 [Presence] in Breast cancer specimen by FISH (B)
    '85337-4', // Estrogen receptor Ag [Presence] in Breast cancer specimen by Immune stain (B)
    '85339-0', // Progesterone receptor Ag [Presence] in Breast cancer specimen by Immune stain (B)
    '2857-1', // Prostate specific Ag [Mass/volume] in Serum or Plasma (P)
  ]
};

const PRIMARY_CANCER_CONDITION_FILTER = 'Condition.code.coding.where($this.code in %primaryCancerConditionCodes)';
const PRIMARY_CANCER_CONDITION_PATH = fhirpath.compile(PRIMARY_CANCER_CONDITION_FILTER, fhirPathVariables);

// specific instance of the "find" function with a precompiled fhirpath, possibly a premature optimization but things are already slow on IE
const findPrimaryCancerCondition = (context) => {
  if (typeof context === 'object' && context.entry) {
    // extract the entries from the bundle
    context = context.entry.map(e => e.resource);
    // otherwise assume it's an array of resources anyway
  }

  const primaryCancers = context.filter( r => isTrue( PRIMARY_CANCER_CONDITION_PATH(r) ) );

  if (primaryCancers.length === 0) {
    return null;
  }

  // TODO: use timestamps to figure out which one, if there are multiple
  return primaryCancers[0];
};



const addCancerReferenceExtension = (resource, context, url) => {
  const primaryCancer = findPrimaryCancerCondition(context, resource);
  if (primaryCancer) {
    const extension = {
      url: url,
      valueReference: {
        reference: `Condition/${primaryCancer.id}`
      }
    };

    addExtension(resource, extension);
  }
};

const addRelatedCancerConditionExtension = (resource, context) =>
  addCancerReferenceExtension(resource, context, 'http://hl7.org/fhir/us/shr/DSTU2/StructureDefinition/onco-core-RelatedCancerCondition-extension');

const addCancerReasonReferenceExtension = (resource, context) =>
  addCancerReferenceExtension(resource, context, 'http://hl7.org/fhir/us/shr/DSTU2/StructureDefinition/onco-core-CancerReasonReference-extension');


const addStageGroupRelated = (resource, context, path) => {
  const relatedItem = find(context, path);

  if (relatedItem) {
    resource.related.push({ target: { reference: `Observation/${relatedItem.id}` } });
  }
};

const defaultProfile = (resourceType) => {
  switch (resourceType) {
      case 'MedicationOrder':
          return 'http://hl7.org/fhir/us/shr/DSTU2/StructureDefinition/shr-core-MedicationRequest';

      case 'AllergyIntolerance':
      case 'Condition':
      case 'DiagnosticReport':
      case 'Encounter':
      case 'MedicationAdministration':
      case 'MedicationRequest':
      case 'Observation':
      case 'Organization':
      case 'Patient':
      case 'Practitioner':
      case 'Procedure':
          return `http://hl7.org/fhir/us/shr/DSTU2/StructureDefinition/shr-core-${resourceType}`;

      default:
          // notable resourceTypes used in Synthea that do not have an SHR profile: CarePlan, Goal, Claim, Immunization, ImagingStudy
          // for that reason, only apply profiles we know actually exist
          return null;
  }
};

module.exports = {addRelatedCancerConditionExtension,
  addCancerReasonReferenceExtension,
  addCancerReferenceExtension,
  addStageGroupRelated,
  defaultProfile,
  findPrimaryCancerCondition,
  fhirPathVariables,
  PRIMARY_CANCER_CONDITION_FILTER,
  PRIMARY_CANCER_CONDITION_PATH};
