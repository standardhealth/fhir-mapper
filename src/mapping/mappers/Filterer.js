const { AggregateMapper } = require('../mapper');
const { hasProfileFromList } = require('../../utils');

// these have nothing to do with mCODE and will just distract people
const excludedTypes = [
  'Provenance'
];

const excludedProfiles = [
// 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-diagnosticreport-note'
];

const resourceMapping = {
  filter: () => true,
  exclude: (resource) =>
    excludedTypes.includes(resource.resourceType) || hasProfileFromList(resource, excludedProfiles),
  mappers: [
  ]
};

class Filterer extends AggregateMapper {
  constructor(_variables = {}) {
    super(resourceMapping, { });
  }
}

module.exports = Filterer;
