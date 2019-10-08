const { AggregateMapper } = require('../mapper');
const { applyProfile, mcodeUtils09 } = require('../../utils');

const resourceMapping = {
  filter: () => true,
  default: (resource, _context) => applyProfile(resource, mcodeUtils09.defaultProfile(resource.resourceType)),
  mappers: [
    {
      filter: 'AllergyIntolerance.where(substance.coding.empty())',
      exec: (resource) => {
        const text = resource.substance.text || '';
        resource.substance.coding = [{
          code: text,
          system: 'missing',
          display: text
        }];

        applyProfile(resource, 'http://hl7.org/fhir/us/shr/DSTU2/StructureDefinition/shr-core-AllergyIntolerance');

        return resource;
      }
    }
  ]
};

class OpenEpicMapper extends AggregateMapper {
  constructor(variables = {}) {
    super(resourceMapping, { ...mcodeUtils09.fhirPathVariables, ...variables });
  }
}

module.exports = OpenEpicMapper;
