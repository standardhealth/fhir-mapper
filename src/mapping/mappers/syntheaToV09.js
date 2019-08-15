const { buildMappers } = require('../mapper');
const { applyProfile, addExtension } = require('../../utils');
const fhirpath = require('fhirpath');
const _ = require('lodash');

const applyProfileFunction = (profile) => {
    // return an anonymous function wrapper to apply this specific profile to given resources
    return (resource, _context) => applyProfile(resource, profile);
};

// FHIRPath helper. FHIRPath tends to return things that are JS truthy (like empty arrays)
// when we would expect a null or other falsy value instead
// TODO: reference the same function here and in mapper
const isTrue = (arg) => {
  if (Array.isArray(arg) ){
    return arg.find(i => isTrue(i));
  } else if (typeof arg === 'object'){
    return !_.isEmpty(arg);
  } else if (typeof arg === 'string' && arg === 'false'){
    return false;
  }
  return arg;
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

// codes are listed with the modules they are used in
// (B) = Breast Cancer, (C) = Colorectal, (L) = Lung, (P) = Prostate
const fhirPathVariables = {
    primaryCancerConditionCodes: [
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
const findPrimaryCancerCondition = (context, resource = null) => {
    if (typeof context === 'object' && context.entry) {
        // extract the entries from the bundle
        context = context.entry.map(e => e.resource);
        // otherwise assume it's an array of resources anyway
    }

    const primaryCancers = context.filter(  r => isTrue( PRIMARY_CANCER_CONDITION_PATH(r) )  );

    if (primaryCancers.length === 0) {
        return null;
    }

    // TODO: use timestamps to figure out which one, if there are multiple
    return primaryCancers[0];
};

const find = (context, path, options={}) => {
     if (typeof context === 'object' && context.entry) {
        // extract the entries from the bundle
        context = context.entry.map(e => e.resource);
        // otherwise assume it's an array of resources anyway
    }

    if (typeof path === 'string') {
        path = fhirpath.compile(path);
    }

    const results = context.filter(  r => isTrue( path(r) )  );
    if (results.length === 0) {
        return null;
    }

    // TODO: use options to figure out which one, if there are multiple
    return results[0];
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

const nthWord = (string, index) => {
    return string.split(' ')[index];
};

const stripParens = (string) => {
    // remove any parenthetical code type from the end of a SNOMED code
    // ex, "Improving (qualifier value)" -> "Improving"

    const endIndex = string.lastIndexOf('(');

    if (endIndex === -1) return string;

    return string.slice(0, endIndex - 1); // endIndex - 1 because there's an extra space at the end too
};

const resourceMapping = {
    filter: () => true,
    default: (resource, _context) => applyProfile(resource, defaultProfile(resource.resourceType)),
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
            exec: (resource, context) => {
                applyProfile(resource, 'http://hl7.org/fhir/us/shr/StructureDefinition/onco-core-CancerDiseaseStatus');

                addRelatedCancerConditionExtension(resource, context);

                resource.valueCodeableConcept.text = resource.valueCodeableConcept.coding[0].display = stripParens(resource.valueCodeableConcept.coding[0].display);

                return resource;
            }
        },
        {
            filter: 'Procedure.code.coding.where($this.code in %radiationCodes)',
            exec: (resource, context) => {
                applyProfile(resource, 'http://hl7.org/fhir/us/shr/StructureDefinition/onco-core-CancerRelatedRadiationProcedure');

                addCancerReasonReferenceExtension(resource, context);

                return resource;
            }
        },
        {
            filter: 'Procedure.code.coding.where($this.code in %surgeryCodes)',
            exec: (resource, context) => {
                applyProfile(resource, 'http://hl7.org/fhir/us/shr/StructureDefinition/onco-core-CancerRelatedSurgicalProcedure');

                addCancerReasonReferenceExtension(resource, context);

                return resource;
            }
        },
        {
            filter: PRIMARY_CANCER_CONDITION_FILTER,
            exec: applyProfileFunction('http://hl7.org/fhir/us/shr/StructureDefinition/onco-core-PrimaryCancerCondition')
        },
        // { // All cancers in Synthea are intended to be primary, even if secondary codes are used
        //     filter: `Condition.code.coding.where(${listContains(SECONDARY_CANCER_CONDITION_CODES, '$this.code')})`,
        //     exec: applyProfileFunction('http://hl7.org/fhir/us/shr/StructureDefinition/onco-core-SecondaryCancerCondition')
        // },
        {
            filter: "Observation.code.coding.where($this.code = '21907-1')",
            exec: (resource, context) => {
                applyProfile(resource, 'http://hl7.org/fhir/us/shr/StructureDefinition/onco-core-TNMClinicalDistantMetastasesCategory');
                addRelatedCancerConditionExtension(resource, context);

                // keep only the first word of the code. ex "T1 category (finding)" -> "T1"
                resource.valueCodeableConcept.text = resource.valueCodeableConcept.coding[0].display = nthWord(resource.valueCodeableConcept.coding[0].display, 0);

                return resource;
            }
        },
        {
            filter: "Observation.code.coding.where($this.code = '21905-5')",
            exec: (resource, context) => {
                applyProfile(resource, 'http://hl7.org/fhir/us/shr/StructureDefinition/onco-core-TNMClinicalPrimaryTumorCategory');
                addRelatedCancerConditionExtension(resource, context);

                // keep only the first word of the code. ex "T1 category (finding)" -> "T1"
                resource.valueCodeableConcept.text = resource.valueCodeableConcept.coding[0].display = nthWord(resource.valueCodeableConcept.coding[0].display, 0);

                return resource;
            }
        },
        {
            filter: "Observation.code.coding.where($this.code = '21906-3')",
            exec: (resource, context) => {
                applyProfile(resource, 'http://hl7.org/fhir/us/shr/StructureDefinition/onco-core-TNMClinicalRegionalNodesCategory');
                addRelatedCancerConditionExtension(resource, context);

                // keep only the first word of the code. ex "T1 category (finding)" -> "T1"
                resource.valueCodeableConcept.text = resource.valueCodeableConcept.coding[0].display = nthWord(resource.valueCodeableConcept.coding[0].display, 0);

                return resource;
            }
        },
        {
            filter: "Observation.code.coding.where($this.code = '21908-9')",
            exec: (resource, context) => {
                applyProfile(resource, 'http://hl7.org/fhir/us/shr/StructureDefinition/onco-core-TNMClinicalStageGroup');
                addRelatedCancerConditionExtension(resource, context);

                // keep only the second word of the code. ex "Stage 1A (qualifier value)" -> "1A"
                resource.valueCodeableConcept.text = resource.valueCodeableConcept.coding[0].display = nthWord(resource.valueCodeableConcept.coding[0].display, 1);

                // find the 3 components and add them to related
                resource.related = resource.related || [];

                addStageGroupRelated(resource, context, "Observation.code.coding.where($this.code = '21905-5')"); // primary tumor
                addStageGroupRelated(resource, context, "Observation.code.coding.where($this.code = '21906-3')"); // regional nodes
                addStageGroupRelated(resource, context, "Observation.code.coding.where($this.code = '21907-1')"); // distant metastases

                return resource;
            }
        },
        {
            filter: "Observation.code.coding.where($this.code = '21901-4')",
            exec: (resource, context) => {
                applyProfile(resource, 'http://hl7.org/fhir/us/shr/StructureDefinition/onco-core-TNMPathologicDistantMetastasesCategory');
                addRelatedCancerConditionExtension(resource, context);

                // keep only the first word of the code. ex "T1 category (finding)" -> "T1"
                resource.valueCodeableConcept.text = resource.valueCodeableConcept.coding[0].display = nthWord(resource.valueCodeableConcept.coding[0].display, 0);

                return resource;
            }
        },
        {
            filter: "Observation.code.coding.where($this.code = '21899-0')",
            exec: (resource, context) => {
                applyProfile(resource, 'http://hl7.org/fhir/us/shr/StructureDefinition/onco-core-TNMPathologicPrimaryTumorCategory');
                addRelatedCancerConditionExtension(resource, context);

                // keep only the first word of the code. ex "T1 category (finding)" -> "T1"
                resource.valueCodeableConcept.text = resource.valueCodeableConcept.coding[0].display = nthWord(resource.valueCodeableConcept.coding[0].display, 0);

                return resource;
            }
        },
        {
            filter: "Observation.code.coding.where($this.code = '21900-6')",
            exec: (resource, context) => {
                applyProfile(resource, 'http://hl7.org/fhir/us/shr/StructureDefinition/onco-core-TNMPathologicRegionalNodesCategory');
                addRelatedCancerConditionExtension(resource, context);

                // keep only the first word of the code. ex "T1 category (finding)" -> "T1"
                resource.valueCodeableConcept.text = resource.valueCodeableConcept.coding[0].display = nthWord(resource.valueCodeableConcept.coding[0].display, 0);

                return resource;
            }
        },
        {
            filter: "Observation.code.coding.where($this.code = '21902-2')",
            exec: (resource, context) => {
                applyProfile(resource, 'http://hl7.org/fhir/us/shr/StructureDefinition/onco-core-TNMPathologicStageGroup');
                addRelatedCancerConditionExtension(resource, context);

                // keep only the second word of the code. ex "Stage 1A (qualifier value)" -> "1A"
                resource.valueCodeableConcept.text = resource.valueCodeableConcept.coding[0].display = nthWord(resource.valueCodeableConcept.coding[0].display, 1);


                // find the 3 components and add them to related
                resource.related = resource.related || [];

                addStageGroupRelated(resource, context, "Observation.code.coding.where($this.code = '21899-0')"); // primary tumor
                addStageGroupRelated(resource, context, "Observation.code.coding.where($this.code = '21900-6')"); // regional nodes
                addStageGroupRelated(resource, context, "Observation.code.coding.where($this.code = '21901-4')"); // distant metastases

                return resource;
            }
        },
        {
            filter: 'Observation.code.coding.where($this.code in %tumorMarkerTestCodes)',
            exec: (resource, context) => {
                applyProfile(resource, 'http://hl7.org/fhir/us/shr/StructureDefinition/onco-core-TumorMarkerTest');

                // replace the raw code with an interpreted code
                const code = resource.code.coding[0].code;

                switch (code) {
                    case '85319-2': // HER2
                        resource.code.text = 'HER2 Receptor';
                        resource.code.coding.unshift({ system: 'LOINC', code: '48676-1', display: 'HER2 [Interpretation] in Tissue' });
                        break;
                    case '85337-4': // ER
                        resource.code.text = 'Estrogen Receptor';
                        resource.code.coding.unshift({ system: 'LOINC', code: '16112-5', display: 'Estrogen receptor [Interpretation] in Tissue' });
                        break;
                    case '85339-0': // PR
                        resource.code.text = 'Progesterone Receptor';
                        resource.code.coding.unshift({ system: 'LOINC', code: '16113-3', display: 'Progesterone receptor [Interpretation] in Tissue' })
                        break;
                }

                // strip "(qualifier value)" from all +/- results
                if (resource.valueCodeableConcept) {
                    resource.valueCodeableConcept.text = resource.valueCodeableConcept.coding[0].display = stripParens(resource.valueCodeableConcept.coding[0].display);
                }

                return resource;
            }
        }
    ]
};


module.exports = buildMappers(resourceMapping, fhirPathVariables);
