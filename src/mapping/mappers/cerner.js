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
  cTCodes: ['AJCCV8 MAG-PRO T Category C', 'AJCCV8 BRE-INV T Category C'],
  pMCodes: ['AJCCV8 MAG-PRO M Category P', 'AJCCV8 BRE-INV M Category P'],
  cMCodes: ['AJCCV8 MAG-PRO M Category C', 'AJCCV8 BRE-INV M Category C'],
  pNCodes: ['AJCCV8 MAG-PRO N Category P', 'AJCCV8 BRE-INV N Category P'],
  cNCodes: ['AJCCV8 MAG-PRO N Category C', 'AJCCV8 BRE-INV N Category C'],
  erCodes: ['AJCCV8 BRE-INV ER Status'],
  prCodes: ['AJCCV8 BRE-INV PR Status'],
  her2Codes: ['AJCCV8 BRE-INV HER2 Status']

};


let simpleValueToCoded = (resource) => {
  resource.valueCodeableConcept.coding = [{
    code: resource.valueCodeableConcept.text,
    display: resource.valueCodeableConcept.text
  }];
}

let pathologicTPath = "Observation.code.text in %pTCodes"
let pathologicNPath = "Observation.code.text in %pNCodes"
let pathologicMPath = "Observation.code.text in %pMCodes"

let clinicalTPath = "Observation.code.text in %cTCodes"
let clinicalNPath = "Observation.code.text in %cNCodes"
let clinicalMPath = "Observation.code.text in %cMCodes"

let mapper = {
  filter: () => true,
  default: (resource, context) => syntheaToV09.execute(resource, context),
  mappers: [

    {
      filter: 'Observation.code.text in %erCodes',
      exec: (resource, context) => {
        resource.code.coding = [{
          code: '16112-5',
          system: 'http://loinc.org',
          display: 'Estrogen receptor [Interpretation] in Tissue'
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
          system: 'http://loinc.org',
          display:  'Progesterone receptor [Interpretation] in Tissue'
        }];

        utils.applyProfile(resource, 'http://hl7.org/fhir/us/fhirURL/StructureDefinition/onco-core-TumorMarkerTest');
        return resource;
      }
    }, {
      filter: 'Observation.code.text in %her2Codes',
      exec: (resource, context) => {
        resource.code.coding = [{
          code: '48676-1',
          system: 'http://loinc.org',
          display: 'HER2 [Interpretation] in Tissue'
        }];

        utils.applyProfile(resource, 'http://hl7.org/fhir/us/fhirURL/StructureDefinition/onco-core-TumorMarkerTest');
        return resource;
      }
    },
   
    {
      filter: 'Observation.code.text  in %pStageCodes',
      exec: (resource, context) => {
        resource.code.coding = [{
          code: '21902-2',
          system: 'http://loinc.org',
          display: 'Stage group.pathology'
        }];

        simpleValueToCoded(resource)
        utils.addRelated(resource, 'has-member', utils.find(context, pathologicTPath, vars))
        utils.addRelated(resource, 'has-member', utils.find(context, pathologicNPath, vars))
        utils.addRelated(resource, 'has-member', utils.find(context, pathologicMPath, vars))
        
        mcodeUtils09.addRelatedCancerConditionExtension(resource, context);
        utils.applyProfile(resource, 'http://hl7.org/fhir/us/shr/StructureDefinition/onco-core-TNMPathologicStageGroup');
        return resource;
      }
    },
    {
      filter: 'Observation.code.text in %cStageCodes',
      exec: (resource, context) => {
        resource.code.coding = [{
          code: '21908-9',
          system: 'http://loinc.org',
          display: 'Stage group.clinical'
        }];

        simpleValueToCoded(resource)
        utils.addRelated(resource, 'has-member', utils.find(context, clinicalTPath, vars))
        utils.addRelated(resource, 'has-member', utils.find(context, clinicalNPath, vars))
        utils.addRelated(resource, 'has-member', utils.find(context, clinicalMPath, vars))
        
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
          system: 'http://loinc.org',
          display: 'Distant metastases.pathology'
        }];

        simpleValueToCoded(resource)
        mcodeUtils09.addRelatedCancerConditionExtension(resource, context);
        utils.applyProfile(resource, 'http://hl7.org/fhir/us/shr/StructureDefinition/onco-core-TNMPathologicDistantMetastasesCategory');
        return resource;
      }
    },
    {
      filter: 'Observation.code.text in %pNCodes',
      exec: (resource, context) => {
        resource.code.coding = [{
          code: '21900-6',
          system: 'http://loinc.org',
          display: 'Regional lymph nodes.pathologic'
        }];

        simpleValueToCoded(resource)
        mcodeUtils09.addRelatedCancerConditionExtension(resource, context);
        utils.applyProfile(resource, 'http://hl7.org/fhir/us/shr/StructureDefinition/onco-core-TNMPathologicRegionalNodesCategory');
        return resource;
      }
    },
    {
      filter: 'Observation.code.text  in %pTCodes',
      exec: (resource, context) => {
        resource.code.coding = [{
          code: '21899-0',
          system: 'http://loinc.org',
          display: 'Primary tumor.pathology'
        }];

        simpleValueToCoded(resource)
        mcodeUtils09.addRelatedCancerConditionExtension(resource, context);
        utils.applyProfile(resource, 'http://hl7.org/fhir/us/shr/StructureDefinition/onco-core-TNMPathologicPrimaryTumorCategory');
        return resource;
      }
    },
    {
      filter: 'Observation.code.text in %cMCodes',
      exec: (resource, context) => {
        resource.code.coding = [{
          code: '21907-1',
          system: 'http://loinc.org',
          display: 'Distant metastases.clinical'
        }];

        simpleValueToCoded(resource)
        mcodeUtils09.addRelatedCancerConditionExtension(resource, context);
        utils.applyProfile(resource, 'http://hl7.org/fhir/us/shr/StructureDefinition/onco-core-TNMClinicalDistantMetastasesCategory');
        return resource;
      }
    },
    {
      filter: 'Observation.code.text  in %cNCodes',
      exec: (resource, context) => {
        resource.code.coding = [{
          code: '21906-3',
          system: 'http://loinc.org',
          display: 'Regional lymph nodes.clinical'
        }];

        simpleValueToCoded(resource)

        mcodeUtils09.addRelatedCancerConditionExtension(resource, context);
        utils.applyProfile(resource, 'http://hl7.org/fhir/us/shr/StructureDefinition/onco-core-TNMClinicalRegionalNodesCategory');
        return resource;
      }
    },
    {
      filter: 'Observation.code.text  in %cTCodes',
      exec: (resource, context) => {
        resource.code.coding = [{
          code: '21905-5',
          system: 'http://loinc.org',
          display: 'Primary tumor.clinical'
        }];

        simpleValueToCoded(resource)

        mcodeUtils09.addRelatedCancerConditionExtension(resource, context);
        utils.applyProfile(resource, 'http://hl7.org/fhir/us/shr/StructureDefinition/onco-core-TNMClinicalPrimaryTumorCategory');
        return resource;
      }
    }
  ],
};

module.exports = buildMappers(mapper,
  vars
);


 // {
    //   filter: "Observation.code.text = 'AJCCV7 Breast Distant Metastasis (M) Pat'",
    //   exec: (resource, context) => {
    //     resource.code.coding = [{
    //       code: '21901-4',
    //       system: 'http://loinc.org'
    //     }];
    //     simpleValueToCoded(resource)
    //     mcodeUtils09.addRelatedCancerConditionExtension(resource, context);
    //     // utils.applyProfile(resource, 'http://hl7.org/fhir/us/fhirURL/StructureDefinition/onco-core-TNMPathologicDistantMetastasesClassification');
    //     return resource;
    //   }
    // },
    // {
    //   filter: "Observation.code.text  = 'AJCCV7 Breast Distant Metastasis (M) Cli'",
    //   exec: (resource, context) => {
    //     resource.code.coding = [{
    //       code: '21907-1',
    //       system: 'http://loinc.org'
    //     }];
    //     simpleValueToCoded(resource)
    //     mcodeUtils09.addRelatedCancerConditionExtension(resource, context);
    //     utils.applyProfile(resource, 'http://hl7.org/fhir/us/fhirURL/StructureDefinition/onco-core-TNMClinicalDistantMetastasesClassification');
    //     return resource;
    //   }
    // },
    // {
    //   filter: "Observation.code.text  = 'AJCCV7 Breast Regional Lymph Nodes (N) P'",
    //   exec: (resource, context) => {
    //     resource.code.coding = [{
    //       code: '21900-6',
    //       system: 'http://loinc.org'
    //     }];
    //     simpleValueToCoded(resource)
    //     mcodeUtils09.addRelatedCancerConditionExtension(resource, context);
    //     //utils.applyProfile(resource, 'http://hl7.org/fhir/us/fhirURL/StructureDefinition/onco-core-TNMPatholgicRegionalNodesClassification');
    //     return resource;
    //   }
    // },
    // {
    //   filter: "Observation.code.text  = 'AJCCV7 Breast Regional Lymph Nodes (N) C'",
    //   exec: (resource, context) => {
    //     resource.code.coding = [{
    //       code: '21906-3',
    //       system: 'http://loinc.org'
    //     }];

    //     simpleValueToCoded(resource)
    //     mcodeUtils09.addRelatedCancerConditionExtension(resource, context);
    //     utils.applyProfile(resource, 'http://hl7.org/fhir/us/fhirURL/StructureDefinition/onco-core-TNMClinicalRegionalNodesClassification');
    //     return resource;
    //   }
    // },