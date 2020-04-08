const fhirpath = require('fhirpath');
const {find, isTrue} = require('./common');


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

  comorbidConditionCodes: [
    // Include codes from http://snomed.info/sct where concept is-a 42343007 (Congestive heart failure)
    '88805009', // chronic congestive heart failure

    // Include codes from http://snomed.info/sct where concept is-a 38341003 (High blood pressure)
    '59621000', // hypertension

    // Include codes from http://snomed.info/sct where concept is-a 413839001 (Chronic lung disease (disorder))
    '87433001', // copd: emphysema
    '185086009', // copd: bronchitis

    // Include codes from http://snomed.info/sct where concept is-a 73211009 (Diabetes mellitus)
    '44054006', // diabetes
    // Include codes from http://snomed.info/sct where concept is-a 40930008 (Hypothyroidism)
    '83664006', // hypothyroidism

    // Include codes from http://snomed.info/sct where concept is-a 42399005 (Renal failure syndrome)
    '127013003', // diabetic renal disease

    // Include codes from http://snomed.info/sct where concept is-a 3723001 (Arthritis)
    '239872002', // osteoarthritis of hip
    '201834006', // OA of hand
    '239873007', // OA of knee

    // Include codes from http://snomed.info/sct where concept is-a 414916001 (Obesity (disorder))
    // NOTE: these 2 codes in Synthea are findings not disorders and are not in the VS
    // '162864005', // obesity (bmi 30+)
    // '408512008', // severely obese (bmi 40+)

    // Include codes from http://snomed.info/sct where concept is-a 271737000 (Anemia)
    '271737000', // anemia

    // Include codes from http://snomed.info/sct where concept is-a 35489007 (Depressive disorder)
    '370143000', // major depressive disorder
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
  ],

  medicationCodes: [
    '1114085', // 100 ML zoledronic acid 0.04 MG/ML Injection (B)
    '993452', // 1 ML denosumab 60 MG/ML Prefilled Syringe (B)
    '1737449', // 10 ML Pamidronate Disodium 3 MG/ML Injection (B)
    '1732186', // 100 ML Epirubicin Hydrochloride 2 MG/ML Injection (B)
    '1790099', // 10 ML Doxorubicin Hydrochloride 2 MG/ML Injection (B)
    '583214', // Paclitaxel 100 MG Injection (B)
    '727762', // 5 ML fulvestrant 50 MG/ML Prefilled Syringe (B)
    '200064', // letrozole 2.5 MG Oral Tablet (B)
    '199224', // anastrozole 1 MG Oral Tablet (B)
    '310261', // exemestane 25 MG Oral Tablet (B)
    '1658084', // ado-trastuzumab emtansine 100 MG Injection (B)
    '672149', // lapatinib 250 MG Oral Tablet (B)
    '1940648', // neratinib 40 MG Oral Tablet (B)
    '2119714', // 5 ML hyaluronidase-oysk 2000 UNT/ML / trastuzumab 120 MG/ML Injection (B)
    '1946840', // Verzenio 100 MG Oral Tablet (B)
    '1601380', // palbociclib 100 MG Oral Capsule (B)
    '1873983', // ribociclib 200 MG Oral Tablet (B)
    '198240', // Tamoxifen 10 MG Oral Tablet (B)
    '1734919', // Cyclophosphamide 1000 MG Injection (B)
    '597195', // Carboplatin 10 MG/ML Injectable Solution (B)
    '1791701', // 10 ML Fluorouracil 50 MG/ML Injection (B)
    '1790099', // 10 ML Doxorubicin Hydrochloride 2 MG/ML Injection (B)
    '1732186', // 100 ML Epirubicin Hydrochloride 2 MG/ML Injection (B)
    '583214', // Paclitaxel 100 MG Injection (B)
  ]
};

const PRIMARY_CANCER_CONDITION_FILTER = 'Condition.code.coding.where($this.code in %primaryCancerConditionCodes)';
const PRIMARY_CANCER_CONDITION_PATH = fhirpath.compile(PRIMARY_CANCER_CONDITION_FILTER, fhirPathVariables);

const COMORBID_CONDITION_FILTER = 'Condition.code.coding.where($this.code in %comorbidConditionCodes)';
const COMORBID_CONDITION_PATH = fhirpath.compile(COMORBID_CONDITION_FILTER, fhirPathVariables);

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

const findComorbidConditions = (primaryCancer, context) => {
  if (typeof context === 'object' && context.entry) {
    // extract the entries from the bundle
    context = context.entry.map(e => e.resource);
    // otherwise assume it's an array of resources anyway
  }

  const comorbidConditions = [];

  const potentialMatches = context.filter( r => isTrue( COMORBID_CONDITION_PATH(r) ) );


  const startA = primaryCancer.onsetDateTime;
  const endA = primaryCancer.abatementDateTime || '2999-12-31T23:59:59Z';
  for (const condition of potentialMatches) {
    // check for oberlapping dates
    // overlap = (StartA <= EndB)  and  (EndA >= StartB)
    const startB = condition.onsetDateTime;
    const endB = condition.abatementDateTime || '2999-12-31T23:59:59Z';
    if ((startA <= endB) && (endA >= startB)) {
      comorbidConditions.push(condition);
    }
  }

  return comorbidConditions;
};

const setPrimaryCancerFocus = (resource, context) => {
  const primaryCancer = findPrimaryCancerCondition(context, resource);
  if (primaryCancer) {
    const reference = {
      reference: `Condition/${primaryCancer.id}`
    };
    resource.focus = resource.focus || [];

    resource.focus.unshift(reference);
  }
  return primaryCancer;
};


const addStageGroupMember = (resource, context, path) => {
  const relatedItem = find(context, path);

  if (relatedItem) {
    resource.hasMember.push({ reference: `Observation/${relatedItem.id}` });
  }
};

module.exports = {
  setPrimaryCancerFocus,
  addStageGroupMember,
  findPrimaryCancerCondition,
  findComorbidConditions,
  fhirPathVariables,
  PRIMARY_CANCER_CONDITION_FILTER,
  PRIMARY_CANCER_CONDITION_PATH
};
