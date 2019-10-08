const rewire = require('rewire');
const { OpenEpicMapper } = rewire('../../mapping/mappers');
const allergyBundle = require('../fixtures/open-epic-bundle.json');

describe('Open Epic Mapper Tests', () => {
    const mapper = new OpenEpicMapper();

    test('should add an AllergyIntolerance profile and coding', () => {
        const mappedBundle = mapper.execute(allergyBundle);
        const allergyIntoleranceEntries = mappedBundle.entry.filter(e => e.resource.resourceType === 'AllergyIntolerance');

        // Should still have an AllergyIntolerance Resource
        expect(allergyIntoleranceEntries.length).toBeGreaterThan(0);

        const resources = allergyIntoleranceEntries.map(e => e.resource);

        resources.forEach(resource => {
            // Resource should have the correct profile
            expect(resource.meta.profile).toContain('http://hl7.org/fhir/us/shr/DSTU2/StructureDefinition/shr-core-AllergyIntolerance');

            // Resource should have a coding if it didn't before the mapping
            expect(resource.substance.coding).toBeDefined();
        });
    });
});
