const { AggregateMapper } = require('../mapper');
const { applyProfile, mcodeUtils09 } = require('../../utils');

const resourceMapping = {
    filter: () => true,
    default: (resource, _context) => applyProfile(resource, mcodeUtils09.defaultProfile(resource.resourceType)),
    mappers: [
        {
            filter: 'AllergyIntolerance',
            exec: (resource, context) => {
                if (!resource.substance.coding) {
                    resource.substance.coding = [{
                        code: resource.substance.text,
                        system: 'http://snomed.info/sct',
                        display: resource.substance.text
                    }];
                }

                applyProfile(resource, 'http://hl7.org/fhir/us/shr/StructureDefinition/shr-core-AllergyIntolerance');

                return resource;
            }
        }
    ]
};

class PartnersMapper extends AggregateMapper {
    constructor(variables = {}) {
        super(resourceMapping, { ...mcodeUtils09.fhirPathVariables, ...variables });
    }
}

module.exports = PartnersMapper;
