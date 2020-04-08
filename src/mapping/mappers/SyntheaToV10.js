const { AggregateMapper } = require('../mapper');
const { applyProfile, hasProfileFromList, mcodeUtils10 } = require('../../utils');

const allRelevantProfiles = [
  'http://hl7.org/fhir/us/mcode/StructureDefinition/mcode-cancer-disease-status',
  'http://hl7.org/fhir/us/mcode/StructureDefinition/mcode-cancer-genetic-variant',
  'http://hl7.org/fhir/us/mcode/StructureDefinition/mcode-cancer-genomics-report',
  'http://hl7.org/fhir/us/mcode/StructureDefinition/mcode-cancer-patient',
  'http://hl7.org/fhir/us/mcode/StructureDefinition/mcode-cancer-related-medication-statement',
  'http://hl7.org/fhir/us/mcode/StructureDefinition/mcode-cancer-related-radiation-procedure',
  'http://hl7.org/fhir/us/mcode/StructureDefinition/mcode-cancer-related-surgical-procedure',
  'http://hl7.org/fhir/us/mcode/StructureDefinition/mcode-comorbid-condition',
  'http://hl7.org/fhir/us/mcode/StructureDefinition/mcode-ecog-performance-status',
  'http://hl7.org/fhir/us/mcode/StructureDefinition/mcode-genetic-specimen',
  'http://hl7.org/fhir/us/mcode/StructureDefinition/mcode-genomic-region-studied',
  'http://hl7.org/fhir/us/mcode/StructureDefinition/mcode-karnofsky-performance-status',
  'http://hl7.org/fhir/us/mcode/StructureDefinition/mcode-primary-cancer-condition',
  'http://hl7.org/fhir/us/mcode/StructureDefinition/mcode-secondary-cancer-condition',
  'http://hl7.org/fhir/us/mcode/StructureDefinition/mcode-tnm-clinical-distant-metastases-category',
  'http://hl7.org/fhir/us/mcode/StructureDefinition/mcode-tnm-clinical-primary-tumor-category',
  'http://hl7.org/fhir/us/mcode/StructureDefinition/mcode-tnm-clinical-regional-nodes-category',
  'http://hl7.org/fhir/us/mcode/StructureDefinition/mcode-tnm-clinical-stage-group',
  'http://hl7.org/fhir/us/mcode/StructureDefinition/mcode-tnm-pathological-distant-metastases-category',
  'http://hl7.org/fhir/us/mcode/StructureDefinition/mcode-tnm-pathological-primary-tumor-category',
  'http://hl7.org/fhir/us/mcode/StructureDefinition/mcode-tnm-pathological-regional-nodes-category',
  'http://hl7.org/fhir/us/mcode/StructureDefinition/mcode-tnm-pathological-stage-group',
  'http://hl7.org/fhir/us/mcode/StructureDefinition/mcode-tumor-marker'
];

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

// these have nothing to do with mCODE and will just distract people
const excludedTypes = [
  'Claim',
  'ExplanationOfBenefit'
];

const resourceMapping = {
  filter: () => true,
  ignore: (resource) => hasProfileFromList(resource, allRelevantProfiles),
  exclude: (resource) => excludedTypes.includes(resource.resourceType),
  // default: (resource, _context) => applyProfile(resource, mcodeUtils10.defaultProfile(resource.resourceType)),
  mappers: [
    {
      filter: 'Patient',
      exec: (resource, _context) => {
        applyProfile(resource, 'http://hl7.org/fhir/us/mcode/StructureDefinition/mcode-cancer-patient');

        return resource;
      }
    },
    {
      filter: "Observation.code.coding.where($this.code = '88040-1')",
      exec: (resource, context) => {
        applyProfile(resource, 'http://hl7.org/fhir/us/mcode/StructureDefinition/mcode-cancer-disease-status');


        mcodeUtils10.setPrimaryCancerFocus(resource, context);

        /* Valid codes are:
            260415000  Not detected (qualifier)
            268910001  Patient's condition improved (finding)
            359746009  Patient's condition stable (finding)
            271299001  Patient's condition worsened (finding)
            709137006  Patient condition undetermined (finding)
           - we should update the synthea module but for now we can translate */
        switch (resource.valueCodeableConcept.coding[0].code) {
          case '385633008': // Improving
            resource.valueCodeableConcept.coding[0].code = '268910001';
            resource.valueCodeableConcept.coding[0].display = 'Patient\'s condition improved (finding)';
            break;
          case '230993007': // Worsening
            resource.valueCodeableConcept.coding[0].code = '271299001';
            resource.valueCodeableConcept.coding[0].display = 'Patient\'s condition worsened (finding)';
            break;
          default:
            // do nothing
        }

        resource.valueCodeableConcept.text = resource.valueCodeableConcept.coding[0].display = stripParens(resource.valueCodeableConcept.coding[0].display);


        return resource;
      }
    },
    {
      filter: 'Procedure.code.coding.where($this.code in %radiationCodes)',
      exec: (resource, _context) => {
        applyProfile(resource, 'http://hl7.org/fhir/us/mcode/StructureDefinition/mcode-cancer-related-radiation-procedure');

        if (resource.code.coding[0].code === '33195004' ||
             resource.code.coding[0].code === '385798007' ) {
          // 33195004: this code isn't actually in the VS, but 4 of its children are,
          // so for now just a replacement code that fits.
          // 385798007: just a generic code, not in the VS either.
          // i'm not a doctor but it seems like photon therapy is the most common?
          resource.code.coding[0].code = '448385000';
          resource.code.coding[0].display = 'Megavoltage radiation therapy using photons (procedure)';
        }

        return resource;
      }
    },
    {
      filter: 'Procedure.code.coding.where($this.code in %surgeryCodes))',
      exec: (resource, _context) => {
        applyProfile(resource, 'http://hl7.org/fhir/us/mcode/StructureDefinition/mcode-cancer-related-surgical-procedure');

        if (resource.code.coding[0].code === '392021009') {
          // this code isn't actually in the VS, but its parent code is.
          // a rare occurrence
          resource.code.coding.unshift({ system: 'http://snomed.info/sct', code: '64368001', display: 'Partial mastectomy (procedure)'});
        }

        return resource;
      }
    },
    {
      filter: mcodeUtils10.PRIMARY_CANCER_CONDITION_FILTER,
      exec: (resource, context) => {
        applyProfile(resource, 'http://hl7.org/fhir/us/mcode/StructureDefinition/mcode-primary-cancer-condition');

        resource.category = resource.category || [];
        resource.category.unshift({ coding: [{ system: 'http://snomed.info/sct', code: '64572001', display: 'Disease (disorder)' }] });

        // add references to staging in Condition.stage.assessment
        // rather than look around for everything here, use the existing infrastructure to add it from elsewhere

        // add comorbid conditions. search through other conditions and tag any that overlap
        // NOTE: this means that there cannot be a separate mapper for these
        const comorbid = mcodeUtils10.findComorbidConditions(resource, context);
        for (const condition of comorbid) {
          applyProfile(condition, 'http://hl7.org/fhir/us/mcode/StructureDefinition/mcode-comorbid-condition');

          // add co-morbid category as well

          condition.category = condition.category || [];
          condition.category.unshift({
            text: 'Co-morbid conditions',
            coding: [{
              system: 'http://snomed.info/sct',
              code: '398192003',
              display: 'Co-morbid conditions (finding)'
            }]
          });
        }

        return resource;
      }
    },
    // { // All cancers in Synthea are intended to be primary, even if secondary codes are used
    //     filter: `Condition.code.coding.where(${listContains(SECONDARY_CANCER_CONDITION_CODES, '$this.code')})`,
    //     exec: applyProfileFunction('http://hl7.org/fhir/us/mcode/StructureDefinition/mcode-secondary-cancer-condition')
    // },
    {
      filter: "Observation.code.coding.where($this.code = '21907-1')",
      exec: (resource, context) => {
        applyProfile(resource, 'http://hl7.org/fhir/us/mcode/StructureDefinition/mcode-tnm-clinical-distant-metastases-category');

        mcodeUtils10.setPrimaryCancerFocus(resource, context);

        // keep only the first word of the code. ex "T1 category (finding)" -> "T1"
        const category = nthWord(resource.valueCodeableConcept.coding[0].display, 0);
        resource.valueCodeableConcept.coding.push({ system: 'http://cancerstaging.org', code: 'c' + category });

        return resource;
      }
    },
    {
      filter: "Observation.code.coding.where($this.code = '21905-5')",
      exec: (resource, context) => {
        applyProfile(resource, 'http://hl7.org/fhir/us/mcode/StructureDefinition/mcode-tnm-clinical-primary-tumor-category');

        mcodeUtils10.setPrimaryCancerFocus(resource, context);

        // keep only the first word of the code. ex "T1 category (finding)" -> "T1"
        const category = nthWord(resource.valueCodeableConcept.coding[0].display, 0);
        resource.valueCodeableConcept.coding.push({ system: 'http://cancerstaging.org', code: 'c' + category });

        return resource;
      }
    },
    {
      filter: "Observation.code.coding.where($this.code = '21906-3')",
      exec: (resource, context) => {
        applyProfile(resource, 'http://hl7.org/fhir/us/mcode/StructureDefinition/mcode-tnm-clinical-regional-nodes-category');

        mcodeUtils10.setPrimaryCancerFocus(resource, context);

        // keep only the first word of the code. ex "T1 category (finding)" -> "T1"
        const category = nthWord(resource.valueCodeableConcept.coding[0].display, 0);
        resource.valueCodeableConcept.coding.push({ system: 'http://cancerstaging.org', code: 'c' + category });

        return resource;
      }
    },
    {
      filter: "Observation.code.coding.where($this.code = '21908-9')",
      exec: (resource, context) => {
        applyProfile(resource, 'http://hl7.org/fhir/us/mcode/StructureDefinition/mcode-tnm-clinical-stage-group');

        const primaryCancer = mcodeUtils10.setPrimaryCancerFocus(resource, context);

        // keep only the second word of the code. ex "Stage 1A (qualifier value)" -> "1A"
        const stage = nthWord(resource.valueCodeableConcept.coding[0].display, 1);
        resource.valueCodeableConcept.coding.push({ system: 'http://cancerstaging.org', code: 'c' + stage });

        // find the 3 components and add them to related
        resource.hasMember = resource.hasMember || [];

        mcodeUtils10.addStageGroupMember(resource, context, "Observation.code.coding.where($this.code = '21905-5')"); // primary tumor
        mcodeUtils10.addStageGroupMember(resource, context, "Observation.code.coding.where($this.code = '21906-3')"); // regional nodes
        mcodeUtils10.addStageGroupMember(resource, context, "Observation.code.coding.where($this.code = '21907-1')"); // distant metastases

        // add this staging and group members to the primary cancer
        if (primaryCancer) {
          primaryCancer.stage = primaryCancer.stage || [];

          const thisStage = {
            type: { coding: [{ system: 'http://snomed.info/sct', code: '260998006', display: 'Clinical staging (qualifier value)' }] },
            summary: resource.valueCodeableConcept,
            assessment: []
          }; thisStage.assessment.push({ reference: 'Observation/' + resource.id }); // THIS resource
          thisStage.assessment.push(...resource.hasMember); // and this resource's components
          primaryCancer.stage.push(thisStage);
        }

        return resource;
      }
    },
    {
      filter: "Observation.code.coding.where($this.code = '21901-4')",
      exec: (resource, context) => {
        applyProfile(resource, 'http://hl7.org/fhir/us/mcode/StructureDefinition/mcode-tnm-pathological-distant-metastases-category');

        mcodeUtils10.setPrimaryCancerFocus(resource, context);

        // keep only the first word of the code. ex "T1 category (finding)" -> "T1"
        const category = nthWord(resource.valueCodeableConcept.coding[0].display, 0);
        resource.valueCodeableConcept.coding.push({ system: 'http://cancerstaging.org', code: 'p' + category });

        return resource;
      }
    },
    {
      filter: "Observation.code.coding.where($this.code = '21899-0')",
      exec: (resource, context) => {
        applyProfile(resource, 'http://hl7.org/fhir/us/mcode/StructureDefinition/mcode-tnm-pathological-primary-tumor-category');

        mcodeUtils10.setPrimaryCancerFocus(resource, context);

        // keep only the first word of the code. ex "T1 category (finding)" -> "T1"
        const category = nthWord(resource.valueCodeableConcept.coding[0].display, 0);
        resource.valueCodeableConcept.coding.push({ system: 'http://cancerstaging.org', code: 'p' + category });

        return resource;
      }
    },
    {
      filter: "Observation.code.coding.where($this.code = '21900-6')",
      exec: (resource, context) => {
        applyProfile(resource, 'http://hl7.org/fhir/us/mcode/StructureDefinition/mcode-tnm-pathological-regional-nodes-category');

        mcodeUtils10.setPrimaryCancerFocus(resource, context);

        // keep only the first word of the code. ex "T1 category (finding)" -> "T1"
        const category = nthWord(resource.valueCodeableConcept.coding[0].display, 0);
        resource.valueCodeableConcept.coding.push({ system: 'http://cancerstaging.org', code: 'p' + category });

        return resource;
      }
    },
    {
      filter: "Observation.code.coding.where($this.code = '21902-2')",
      exec: (resource, context) => {
        applyProfile(resource, 'http://hl7.org/fhir/us/mcode/StructureDefinition/mcode-tnm-pathological-stage-group');

        const primaryCancer = mcodeUtils10.setPrimaryCancerFocus(resource, context);

        // keep only the second word of the code. ex "Stage 1A (qualifier value)" -> "1A"
        const stage = nthWord(resource.valueCodeableConcept.coding[0].display, 1);
        resource.valueCodeableConcept.coding.push({ system: 'http://cancerstaging.org', code: 'p' + stage });


        // find the 3 components and add them to related
        resource.hasMember = resource.hasMember || [];

        mcodeUtils10.addStageGroupMember(resource, context, "Observation.code.coding.where($this.code = '21899-0')"); // primary tumor
        mcodeUtils10.addStageGroupMember(resource, context, "Observation.code.coding.where($this.code = '21900-6')"); // regional nodes
        mcodeUtils10.addStageGroupMember(resource, context, "Observation.code.coding.where($this.code = '21901-4')"); // distant metastases

        // add this staging and group members to the primary cancer
        if (primaryCancer) {
          primaryCancer.stage = primaryCancer.stage || [];

          const thisStage = {
            type: { coding: [{ system: 'http://snomed.info/sct', code: '261023001', display: 'Pathological staging (qualifier value)' }] },
            summary: resource.valueCodeableConcept,
            assessment: []
          };
          thisStage.assessment.push({ reference: 'Observation/' + resource.id }); // THIS resource
          thisStage.assessment.push(...resource.hasMember); // and this resource's components
          primaryCancer.stage.push(thisStage);
        }

        return resource;
      }
    },
    {
      filter: 'Observation.code.coding.where($this.code in %tumorMarkerTestCodes)',
      exec: (resource, context) => {
        applyProfile(resource, 'http://hl7.org/fhir/us/mcode/StructureDefinition/mcode-tumor-marker');

        mcodeUtils10.setPrimaryCancerFocus(resource, context);

        // replace the raw code with an interpreted code
        const code = resource.code.coding[0].code;

        switch (code) {
          case '85318-4': // HER2 by FISH
            const cc = { coding: [{ system: 'http://snomed.info/sct' }] };
            resource.valueCodeableConcept = cc;

            if (resource.valueString === 'greater than 2.2') {
              cc.text = cc.coding[0].display = 'Positive (qualifier value)';
              cc.coding[0].code = '10828004';
            } else {
              cc.text = cc.coding[0].display = 'Negative (qualifier value)';
              cc.coding[0].code = '260385009';
            }

            delete resource.valueString;
            break;
            // note intentional passthrough
          case '85319-2': // HER2
            resource.code.text = 'HER2 Receptor';
            resource.code.coding.unshift({ system: 'http://loinc.org', code: '48676-1', display: 'HER2 [Interpretation] in Tissue' });
            break;
          case '85337-4': // ER
            resource.code.text = 'Estrogen Receptor';
            resource.code.coding.unshift({ system: 'http://loinc.org', code: '16112-5', display: 'Estrogen receptor [Interpretation] in Tissue' });
            break;
          case '85339-0': // PR
            resource.code.text = 'Progesterone Receptor';
            resource.code.coding.unshift({ system: 'http://loinc.org', code: '16113-3', display: 'Progesterone receptor [Interpretation] in Tissue' });
            break;
        }

        // strip "(qualifier value)" from all +/- results
        // if (resource.valueCodeableConcept) {
        //   resource.valueCodeableConcept.text = resource.valueCodeableConcept.coding[0].display = stripParens(resource.valueCodeableConcept.coding[0].display);
        // }

        return resource;
      }
    },
    {
      filter: 'MedicationRequest.medicationCodeableConcept.coding.where($this.code in %medicationCodes)',
      exec: (resource, _context) => {
        const converted = {
          resourceType: 'MedicationStatement',
          id: resource.id,
          meta: {
            profile: ['http://hl7.org/fhir/us/mcode/StructureDefinition/mcode-cancer-related-medication-statement']
          },
          status: resource.status,
          medicationCodeableConcept: resource.medicationCodeableConcept,
          subject: resource.subject,
          context: resource.context,
          effectiveDateTime: resource.authoredOn
        };

        if (converted.status === 'stopped') {
          converted.status = 'completed';
        }

        return converted;
      }
    },
    {
      filter: 'MedicationRequest',
      // all other MedicationRequests
      exec: (resource) => {
        if (resource.status === 'stopped') {
          resource.status = 'completed';
        }

        return resource;
      }
    },
    {
      filter: "Observation.code.coding.where($this.code = '44667-4')",
      exec: _ => null // exclude "Site of distant metastasis in Breast tumor"
    },
    {
      filter: "Observation.code.coding.where($this.code = '85352-3')",
      // should be category: laboratory, not imaging
      exec: resource => {
        if (resource.category) {
          const coding = resource.category[0].coding[0];
          coding.code = coding.display = 'laboratory';
        }
        return resource;
      }
    }
  ]
};

class SyntheaToV10 extends AggregateMapper {
  constructor(variables = {}) {
    super(resourceMapping, { ...mcodeUtils10.fhirPathVariables, ...variables });
  }
}

module.exports = SyntheaToV10;
