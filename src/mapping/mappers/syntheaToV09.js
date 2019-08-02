const { buildMappers } = require('../mapper');

const applyProfile = (resource, profile) => {
    if (profile) {
        resource.meta = resource.meta || {};
        resource.meta.profile = resource.meta.profile || [];
        resource.meta.profile.unshift(profile); // put this profile first in the list
    }
    return resource;
};

const applyProfileFunction = (profile) => {
    // return an anonymous function wrapper to apply this specific profile to given resources
    return (resource) => applyProfile(resource, profile);
};

const defaultProfile = (resourceType) => `http://hl7.org/fhir/us/shr/DSTU2/StructureDefinition/shr-core-${resourceType}`;

// FHIRPath supports list membership tests, but not list literals (as far as I can tell).
// so instead of something nice like "where(code in ['1','2','3'])" we have to do "where(code = '1' or code = '2' or code = '3')"
const listContains = (list, variableName, addQuotes = false) => {
    if (addQuotes) {
        list = list.map(e => `'${e}'`);
    }
    return list.map(e => `${variableName} = ${e}`).join(' or ');
};


// codes are listed with the modules they are used in
// (B) = Breast Cancer, (C) = Colorectal, (L) = Lung, (P) = Prostate

const PRIMARY_CANCER_CONDITION_CODES = [
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
];
const SURGERY_CODES = [
    '396487001', // Sentinel lymph node biopsy (procedure) (B)
    '443497002', // Excision of sentinel lymph node (procedure) (B)
    '234262008', // Excision of axillary lymph node (procedure) (B)
    '392021009', // Lumpectomy of breast (procedure) (B)
    '69031006', // Excision of breast tissue (procedure) (B)
    '387607004', // Construction of diverting colostomy (B)
    '43075005', // Partial resection of colon (B)
    '90470006', // Prostatectomy (P)
];
const RADIATION_CODES = [
    '447759004', // Brachytherapy of breast (procedure) (B)
    '384692006', // Intracavitary brachytherapy (procedure) (B)
    '113120007', // Interstitial brachytherapy (procedure) (B)
    '33195004', // Teleradiotherapy procedure (procedure) (B)
    '385798007', // Radiation therapy care (regime/therapy) (B)
    '108290001', // Radiation oncology AND/OR radiotherapy (procedure) (B)
];
const TUMOR_MARKER_TEST_CODES = [
    '85319-2', // HER2 [Presence] in Breast cancer specimen by Immune stain (B)
    '85318-4', // HER2 [Presence] in Breast cancer specimen by FISH (B)
    '85337-4', // Estrogen receptor Ag [Presence] in Breast cancer specimen by Immune stain (B)
    '85339-0', // Progesterone receptor Ag [Presence] in Breast cancer specimen by Immune stain (B)
    '2857-1', // Prostate specific Ag [Mass/volume] in Serum or Plasma (P)
];



const resourceMapping = {
    filter: () => true,
    default: (resource) => applyProfile(resource, defaultProfile(resource.resourceType)),
    mappers: [
        {
            filter: "Observation.code.coding.where($this.code = '55284-4')",
            exec: applyProfileFunction('http://hl7.org/fhir/us/shr/StructureDefinition/shr-core-BloodPressure')
        },
        {
            filter: "Observation.code.coding.where($this.code = '8302-2')",
            exec: applyProfileFunction('http://hl7.org/fhir/us/shr/StructureDefinition/shr-core-BodyHeight')
        },
        {
            filter: "Observation.code.coding.where($this.code = '29463-7')",
            exec: applyProfileFunction('http://hl7.org/fhir/us/shr/StructureDefinition/shr-core-BodyWeight')
        },
        {
            filter: "Observation.code.coding.where($this.code = '88040-1')",
            exec: applyProfileFunction('http://hl7.org/fhir/us/shr/StructureDefinition/onco-core-CancerDiseaseStatus')
        },
        {
            filter: `Procedure.code.coding.where(${listContains(RADIATION_CODES, '$this.code')})`,
            exec: applyProfileFunction('http://hl7.org/fhir/us/shr/StructureDefinition/onco-core-CancerRelatedRadiationProcedure')
        },
        {
            filter: `Procedure.code.coding.where(${listContains(SURGERY_CODES, '$this.code')})`,
            exec: applyProfileFunction('http://hl7.org/fhir/us/shr/StructureDefinition/onco-core-CancerRelatedSurgicalProcedure')
        },
        {
            filter: `Condition.code.coding.where(${listContains(PRIMARY_CANCER_CONDITION_CODES, '$this.code')})`,
            exec: applyProfileFunction('http://hl7.org/fhir/us/shr/StructureDefinition/onco-core-PrimaryCancerCondition')
        },
        // { // All cancers in Synthea are intended to be primary, even if secondary codes are used
        //     filter: `Condition.code.coding.where(${listContains(SECONDARY_CANCER_CONDITION_CODES, '$this.code')})`,
        //     exec: applyProfileFunction('http://hl7.org/fhir/us/shr/StructureDefinition/onco-core-SecondaryCancerCondition')
        // },
        {
            filter: "Observation.code.coding.where($this.code = '21907-1')",
            exec: applyProfileFunction('http://hl7.org/fhir/us/shr/StructureDefinition/onco-core-TNMClinicalDistantMetastasesCategory')
        },
        {
            filter: "Observation.code.coding.where($this.code = '21905-5')",
            exec: applyProfileFunction('http://hl7.org/fhir/us/shr/StructureDefinition/onco-core-TNMClinicalPrimaryTumorCategory')
        },
        {
            filter: "Observation.code.coding.where($this.code = '21906-3')",
            exec: applyProfileFunction('http://hl7.org/fhir/us/shr/StructureDefinition/onco-core-TNMClinicalRegionalNodesCategory')
        },
        {
            filter: "Observation.code.coding.where($this.code = '21908-9')",
            exec: applyProfileFunction('http://hl7.org/fhir/us/shr/StructureDefinition/onco-core-TNMClinicalStageGroup')
        },
        {
            filter: "Observation.code.coding.where($this.code = '21901-4')",
            exec: applyProfileFunction('http://hl7.org/fhir/us/shr/StructureDefinition/onco-core-TNMPathologicDistantMetastasesCategory')
        },
        {
            filter: "Observation.code.coding.where($this.code = '21899-0')",
            exec: applyProfileFunction('http://hl7.org/fhir/us/shr/StructureDefinition/onco-core-TNMPathologicPrimaryTumorCategory')
        },
        {
            filter: "Observation.code.coding.where($this.code = '21900-6')",
            exec: applyProfileFunction('http://hl7.org/fhir/us/shr/StructureDefinition/onco-core-TNMPathologicRegionalNodesCategory')
        },
        {
            filter: "Observation.code.coding.where($this.code = '21902-2')",
            exec: applyProfileFunction('http://hl7.org/fhir/us/shr/StructureDefinition/onco-core-TNMPathologicStageGroup')
        },
        {
            filter: `Observation.code.coding.where(${listContains(TUMOR_MARKER_TEST_CODES, '$this.code')})`,
            exec: applyProfileFunction('http://hl7.org/fhir/us/shr/StructureDefinition/onco-core-TumorMarkerTest')
        }
    ]
};

module.exports = buildMappers(resourceMapping);
