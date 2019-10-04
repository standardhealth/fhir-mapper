const rewire = require('rewire');
const { PartnersMapper } = rewire('../../mapping/mappers');
const allergyBundle = require('../fixtures/patient-allergy-bundle.json');

describe('Partners Mapper Tests', () => {
    const mapper = new PartnersMapper();

    test('should add an AllergyIntolerance profile and coding', () => {
        const mappedBundle = mapper.execute(allergyBundle);
        const allergyIntoleranceEntry = mappedBundle.entry.find(e => e.resource.resourceType === 'AllergyIntolerance');

        // Should still have an AllergyIntolerance Resource
        expect(allergyIntoleranceEntry).toBeDefined();

        const { resource } = allergyIntoleranceEntry;

        // Resource should have the correct profile
        expect(resource.meta.profile).toContain('http://hl7.org/fhir/us/shr/StructureDefinition/shr-core-AllergyIntolerance');

        // Resource should have a coding if it didn't before the mapping
        expect(resource.substance.coding).toBeDefined();
    });
});
