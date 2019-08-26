const { buildMappers } = require('../mapper');
const { applyProfile, applyProfileFunction } = require('../../utils/common');
const mcodeUtils09 = require('../../utils/mcodeUtils09');


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


const nthWord = (string, index) => {
    return string.split(' ')[index];
};

const stripParens = (string) => {
    // remove any parenthetical code type from the end of a SNOMED code
    // ex, "Improving (qualifier value)" -> "Improving"

    const endIndex = string.lastIndexOf('(');

    if (endIndex === -1) {return string;}

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

                mcodeUtils09.addRelatedCancerConditionExtension(resource, context);

                resource.valueCodeableConcept.text = resource.valueCodeableConcept.coding[0].display = stripParens(resource.valueCodeableConcept.coding[0].display);

                return resource;
            }
        },
        {
            filter: 'Procedure.code.coding.where($this.code in %radiationCodes)',
            exec: (resource, context) => {
                applyProfile(resource, 'http://hl7.org/fhir/us/shr/StructureDefinition/onco-core-CancerRelatedRadiationProcedure');

                mcodeUtils09.addCancerReasonReferenceExtension(resource, context);

                return resource;
            }
        },
        {
            filter: 'Procedure.code.coding.where($this.code in %surgeryCodes))',
            exec: (resource, context) => {
                applyProfile(resource, 'http://hl7.org/fhir/us/shr/StructureDefinition/onco-core-CancerRelatedSurgicalProcedure');

                mcodeUtils09.addCancerReasonReferenceExtension(resource, context);

                return resource;
            }
        },
        {
            filter: mcodeUtils09.PRIMARY_CANCER_CONDITION_FILTER,
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
                mcodeUtils09.addRelatedCancerConditionExtension(resource, context);

                // keep only the first word of the code. ex "T1 category (finding)" -> "T1"
                resource.valueCodeableConcept.text = resource.valueCodeableConcept.coding[0].display = nthWord(resource.valueCodeableConcept.coding[0].display, 0);

                return resource;
            }
        },
        {
            filter: "Observation.code.coding.where($this.code = '21905-5')",
            exec: (resource, context) => {
                applyProfile(resource, 'http://hl7.org/fhir/us/shr/StructureDefinition/onco-core-TNMClinicalPrimaryTumorCategory');
                mcodeUtils09.addRelatedCancerConditionExtension(resource, context);

                // keep only the first word of the code. ex "T1 category (finding)" -> "T1"
                resource.valueCodeableConcept.text = resource.valueCodeableConcept.coding[0].display = nthWord(resource.valueCodeableConcept.coding[0].display, 0);

                return resource;
            }
        },
        {
            filter: "Observation.code.coding.where($this.code = '21906-3')",
            exec: (resource, context) => {
                applyProfile(resource, 'http://hl7.org/fhir/us/shr/StructureDefinition/onco-core-TNMClinicalRegionalNodesCategory');
                mcodeUtils09.addRelatedCancerConditionExtension(resource, context);

                // keep only the first word of the code. ex "T1 category (finding)" -> "T1"
                resource.valueCodeableConcept.text = resource.valueCodeableConcept.coding[0].display = nthWord(resource.valueCodeableConcept.coding[0].display, 0);

                return resource;
            }
        },
        {
            filter: "Observation.code.coding.where($this.code = '21908-9')",
            exec: (resource, context) => {
                applyProfile(resource, 'http://hl7.org/fhir/us/shr/StructureDefinition/onco-core-TNMClinicalStageGroup');
                mcodeUtils09.addRelatedCancerConditionExtension(resource, context);

                // keep only the second word of the code. ex "Stage 1A (qualifier value)" -> "1A"
                resource.valueCodeableConcept.text = resource.valueCodeableConcept.coding[0].display = nthWord(resource.valueCodeableConcept.coding[0].display, 1);

                // find the 3 components and add them to related
                resource.related = resource.related || [];

                mcodeUtils09.addStageGroupRelated(resource, context, "Observation.code.coding.where($this.code = '21905-5')"); // primary tumor
                mcodeUtils09.addStageGroupRelated(resource, context, "Observation.code.coding.where($this.code = '21906-3')"); // regional nodes
                mcodeUtils09.addStageGroupRelated(resource, context, "Observation.code.coding.where($this.code = '21907-1')"); // distant metastases

                return resource;
            }
        },
        {
            filter: "Observation.code.coding.where($this.code = '21901-4')",
            exec: (resource, context) => {
                applyProfile(resource, 'http://hl7.org/fhir/us/shr/StructureDefinition/onco-core-TNMPathologicDistantMetastasesCategory');
                mcodeUtils09.addRelatedCancerConditionExtension(resource, context);

                // keep only the first word of the code. ex "T1 category (finding)" -> "T1"
                resource.valueCodeableConcept.text = resource.valueCodeableConcept.coding[0].display = nthWord(resource.valueCodeableConcept.coding[0].display, 0);

                return resource;
            }
        },
        {
            filter: "Observation.code.coding.where($this.code = '21899-0')",
            exec: (resource, context) => {
                applyProfile(resource, 'http://hl7.org/fhir/us/shr/StructureDefinition/onco-core-TNMPathologicPrimaryTumorCategory');
                mcodeUtils09.addRelatedCancerConditionExtension(resource, context);

                // keep only the first word of the code. ex "T1 category (finding)" -> "T1"
                resource.valueCodeableConcept.text = resource.valueCodeableConcept.coding[0].display = nthWord(resource.valueCodeableConcept.coding[0].display, 0);

                return resource;
            }
        },
        {
            filter: "Observation.code.coding.where($this.code = '21900-6')",
            exec: (resource, context) => {
                applyProfile(resource, 'http://hl7.org/fhir/us/shr/StructureDefinition/onco-core-TNMPathologicRegionalNodesCategory');
                mcodeUtils09.addRelatedCancerConditionExtension(resource, context);

                // keep only the first word of the code. ex "T1 category (finding)" -> "T1"
                resource.valueCodeableConcept.text = resource.valueCodeableConcept.coding[0].display = nthWord(resource.valueCodeableConcept.coding[0].display, 0);

                return resource;
            }
        },
        {
            filter: "Observation.code.coding.where($this.code = '21902-2')",
            exec: (resource, context) => {
                applyProfile(resource, 'http://hl7.org/fhir/us/shr/StructureDefinition/onco-core-TNMPathologicStageGroup');
                mcodeUtils09.addRelatedCancerConditionExtension(resource, context);

                // keep only the second word of the code. ex "Stage 1A (qualifier value)" -> "1A"
                resource.valueCodeableConcept.text = resource.valueCodeableConcept.coding[0].display = nthWord(resource.valueCodeableConcept.coding[0].display, 1);


                // find the 3 components and add them to related
                resource.related = resource.related || [];

                mcodeUtils09.addStageGroupRelated(resource, context, "Observation.code.coding.where($this.code = '21899-0')"); // primary tumor
                mcodeUtils09.addStageGroupRelated(resource, context, "Observation.code.coding.where($this.code = '21900-6')"); // regional nodes
                mcodeUtils09.addStageGroupRelated(resource, context, "Observation.code.coding.where($this.code = '21901-4')"); // distant metastases

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
                        resource.code.coding.unshift({ system: 'LOINC', code: '16113-3', display: 'Progesterone receptor [Interpretation] in Tissue' });
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


module.exports = buildMappers(resourceMapping, mcodeUtils09.fhirPathVariables);
