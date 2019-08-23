const {
  buildMappers
} = require('../mapper');
const utils = require('../../utils/common');
const mcodeUtils09 = require('../../utils/mcodeUtils09');
const syntheaToV09 = require('./syntheaToV09');

let vars = {
  pStageCodes: [ 'AJCCV8 MAG-PRO P Stage', 'AJCCV8 BRE-INV P Stage'],
  cStageCodes: ['AJCCV8 MAG-PRO C Stage', 'AJCCV8 BRE-INV C Stage'],
  pTCodes: ['AJCCV8 MAG-PRO T Category P', 'AJCCV8 BRE-INV T Category P'],
  cTCdoes: ['AJCCV8 MAG-PRO T Category C', 'AJCCV8 BRE-INV T Category C'],
  pMcodes: ['AJCCV8 MAG-PRO M Category P', 'AJCCV8 BRE-INV M Category P'],
  cMCodes: ['AJCCV8 MAG-PRO M Category C', 'AJCCV8 BRE-INV M Category C'],
  pNCodes: ['AJCCV8 MAG-PRO N Category P', 'AJCCV8 BRE-INV N Category P'],
  cNCodes: ['AJCCV8 MAG-PRO N Category C', 'AJCCV8 BRE-INV N Category C'],
  erCodes: ['AJCCV8 BRE-INV ER Status'],
  prCodes: ['AJCCV8 BRE-INV PR Status'],
  her2Codes: ['AJCCV8 BRE-INV HER2 Status']

};

let mapper = {
  filter: () => true,
  default: (resource, context) => syntheaToV09.execute(resource, context),
  mappers: [

    {
      filter: 'Observation.code.text in %erCodes',
      exec: (resource, context) => {
        resource.code.coding = [{
          code: '16112-5',
          system: 'http://loinc.org'
        }];

        utils.applyProfile(resource, 'http://hl7.org/fhir/us/fhirURL/StructureDefinition/onco-core-TumorMarkerTest');
        return resource;
      }
    },
    {
      filter: 'Observation.code.text in %prCodes',
      exec: (resource, context) => {
        resource.code.coding = [{
          code: '16113-3',
          system: 'http://loinc.org'
        }];

        utils.applyProfile(resource, 'http://hl7.org/fhir/us/fhirURL/StructureDefinition/onco-core-TumorMarkerTest');
        return resource;
      }
    }, {
      filter: 'Observation.code.text in %her2Codes',
      exec: (resource, context) => {
        resource.code.coding = [{
          code: '48676-1',
          system: 'http://loinc.org'
        }];

        utils.applyProfile(resource, 'http://hl7.org/fhir/us/fhirURL/StructureDefinition/onco-core-TumorMarkerTest');
        return resource;
      }
    },
    {
      filter: "Observation.code.text = 'AJCCV7 Breast Distant Metastasis (M) Pat'",
      exec: (resource, context) => {
        resource.code.coding = [{
          code: '21901-4',
          system: 'http://loinc.org'
        }];
        resource.valueCodeableConcept.coding = [{
          code: resource.valueCodeableConcept.text
        }];
        mcodeUtils09.addRelatedCancerConditionExtension(resource, context);
        // utils.applyProfile(resource, 'http://hl7.org/fhir/us/fhirURL/StructureDefinition/onco-core-TNMPathologicDistantMetastasesClassification');
        return resource;
      }
    },
    {
      filter: "Observation.code.text  = 'AJCCV7 Breast Distant Metastasis (M) Cli'",
      exec: (resource, context) => {
        resource.code.coding = [{
          code: '21907-1',
          system: 'http://loinc.org'
        }];

        resource.valueCodeableConcept.coding = [{
          code: resource.valueCodeableConcept.text
        }];
        mcodeUtils09.addRelatedCancerConditionExtension(resource, context);
        utils.applyProfile(resource, 'http://hl7.org/fhir/us/fhirURL/StructureDefinition/onco-core-TNMClinicalDistantMetastasesClassification');
        return resource;
      }
    },
    {
      filter: "Observation.code.text  = 'AJCCV7 Breast Regional Lymph Nodes (N) P'",
      exec: (resource, context) => {
        resource.code.coding = [{
          code: '21900-6',
          system: 'http://loinc.org'
        }];
        resource.valueCodeableConcept.coding = [{
          code: resource.valueCodeableConcept.text
        }];
        mcodeUtils09.addRelatedCancerConditionExtension(resource, context);
        //utils.applyProfile(resource, 'http://hl7.org/fhir/us/fhirURL/StructureDefinition/onco-core-TNMPatholgicRegionalNodesClassification');
        return resource;
      }
    },
    {
      filter: "Observation.code.text  = 'AJCCV7 Breast Regional Lymph Nodes (N) C'",
      exec: (resource, context) => {
        resource.code.coding = [{
          code: '21906-3',
          system: 'http://loinc.org'
        }];

        resource.valueCodeableConcept.coding = [{
          code: resource.valueCodeableConcept.text
        }];
        mcodeUtils09.addRelatedCancerConditionExtension(resource, context);
        utils.applyProfile(resource, 'http://hl7.org/fhir/us/fhirURL/StructureDefinition/onco-core-TNMClinicalRegionalNodesClassification');
        return resource;
      }
    },
    {
      filter: 'Observation.code.text  in %pStageCodes',
      exec: (resource, context) => {
        resource.code.coding = [{
          code: '21902-2',
          system: 'http://loinc.org'
        }];

        resource.valueCodeableConcept.coding = [{
          code: resource.valueCodeableConcept.text
        }];
        mcodeUtils09.addRelatedCancerConditionExtension(resource, context);
        utils.applyProfile(resource, 'http://hl7.org/fhir/us/fhirURL/StructureDefinition/onco-core-TNMPatholgicStageGroup');
        return resource;
      }
    },
    {
      filter: 'Observation.code.text in %cStageCodes',
      exec: (resource, context) => {
        resource.code.coding = [{
          code: '21908-9',
          system: 'http://loinc.org'
        }];

        resource.valueCodeableConcept.coding = [{
          code: resource.valueCodeableConcept.text
        }];

        utils.applyProfile(resource, 'http://hl7.org/fhir/us/fhirURL/StructureDefinition/onco-core-TNMClinicalStageGroup');
        mcodeUtils09.addRelatedCancerConditionExtension(resource, context);
        return resource;
      }
    }, ///
    {
      filter: 'Observation.code.text in %pMCodes',
      exec: (resource, context) => {
        resource.code.coding = [{
          code: '21901-4',
          system: 'http://loinc.org'
        }];

        resource.valueCodeableConcept.coding = [{
          code: resource.valueCodeableConcept.text
        }];
        mcodeUtils09.addRelatedCancerConditionExtension(resource, context);
        utils.applyProfile(resource, 'http://hl7.org/fhir/us/fhirURL/StructureDefinition/onco-core-TNMPathologicDistantMetastasesClassification');
        return resource;
      }
    },
    {
      filter: 'Observation.code.text in %pNCodes',
      exec: (resource, context) => {
        resource.code.coding = [{
          code: '21900-6',
          system: 'http://loinc.org'
        }];

        resource.valueCodeableConcept.coding = [{
          code: resource.valueCodeableConcept.text
        }];
        mcodeUtils09.addRelatedCancerConditionExtension(resource, context);
        utils.applyProfile(resource, 'http://hl7.org/fhir/us/fhirURL/StructureDefinition/onco-core-TNMPatholgicRegionalNodesClassification');
        return resource;
      }
    },
    {
      filter: 'Observation.code.text  in %pTCodes',
      exec: (resource, context) => {
        resource.code.coding = [{
          code: '21899-0',
          system: 'http://loinc.org'
        }];

        resource.valueCodeableConcept.coding = [{
          code: resource.valueCodeableConcept.text
        }];
        mcodeUtils09.addRelatedCancerConditionExtension(resource, context);
        utils.applyProfile(resource, 'http://hl7.org/fhir/us/fhirURL/StructureDefinition/onco-core-TNMPathologicPrimaryTumorCategory');
        return resource;
      }
    },
    {
      filter: 'Observation.code.text in %cMCodes',
      exec: (resource, context) => {
        resource.code.coding = [{
          code: '21907-1',
          system: 'http://loinc.org'
        }];

        resource.valueCodeableConcept.coding = [{
          code: resource.valueCodeableConcept.text
        }];
        mcodeUtils09.addRelatedCancerConditionExtension(resource, context);
        utils.applyProfile(resource, 'http://hl7.org/fhir/us/fhirURL/StructureDefinition/onco-core-TNMClinicalDistantMetastasesClassificationn');
        return resource;
      }
    },
    {
      filter: 'Observation.code.text  in %cNCodes',
      exec: (resource, context) => {
        resource.code.coding = [{
          code: '21906-3',
          system: 'http://loinc.org'
        }];

        resource.valueCodeableConcept.coding = [{
          code: resource.valueCodeableConcept.text
        }];
        mcodeUtils09.addRelatedCancerConditionExtension(resource, context);
        utils.applyProfile(resource, 'http://hl7.org/fhir/us/fhirURL/StructureDefinition/onco-core-TNMClinicalRegionalNodesClassification');
        return resource;
      }
    },
    {
      filter: 'Observation.code.text  in %cTCodes',
      exec: (resource, context) => {
        resource.code.coding = [{
          code: '21905-5',
          system: 'http://loinc.org'
        }];

        resource.valueCodeableConcept.coding = [{
          code: resource.valueCodeableConcept.text
        }];
        mcodeUtils09.addRelatedCancerConditionExtension(resource, context);
        utils.applyProfile(resource, 'http://hl7.org/fhir/us/fhirURL/StructureDefinition/onco-core-TNMClinicalPrimaryTumorCategory');
        return resource;
      }
    }
  ],
};

module.exports = buildMappers(mapper,
  vars
);
