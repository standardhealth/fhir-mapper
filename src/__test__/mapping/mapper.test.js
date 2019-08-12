const rewire = require('rewire');
const mapping = rewire('../../mapping/mapper'); // Bring your module in with rewire

describe('Mapping Tests', () => {

  test('should be able to tell truthy things from falsy things', () => {
    let isTrue = mapping.__get__('isTrue');
    expect(isTrue()).toBeFalsy();
    expect(isTrue(null)).toBeFalsy();
    expect(isTrue([null])).toBeFalsy();
    expect(isTrue({})).toBeFalsy();
    expect(isTrue('false')).toBeFalsy();
    expect(isTrue(['false', null, [], {}])).toBeFalsy();

    expect(isTrue(true)).toBeTruthy();
    expect(isTrue([1])).toBeTruthy();
    expect(isTrue({hey: ''})).toBeTruthy();
    expect(isTrue('true')).toBeTruthy();
    expect(isTrue('string')).toBeTruthy();

  });

	test('should be able to create a filter based off of a string', () => {
    let buildFilter = mapping.__get__('buildFilter');
    let filter = buildFilter('Patient.name');
    expect(filter).toBeTruthy();
    let resource1 = {resourceType: 'Patient', name: {given: 'James'}};
    let resource2 = {resourceType: 'Patient'};
    expect(filter(resource1)).toBeTruthy();
    expect(filter(resource2)).toBeFalsy();
	});

  test('should be able to create a filter based off of a function', () => {
    let buildFilter = mapping.__get__('buildFilter');
    let func = (_arg) => true;
    let filter = buildFilter(func);
    expect(filter).toBe(func);
	});

  test('should be able to create a filter based off of an array of filters', () => {
    let buildFilter = mapping.__get__('buildFilter');
    let filters = ['Patient.name', 'Patient'];
    let filter = buildFilter(filters);
    expect(filter).toBeTruthy();
    let resource1 = {resourceType: 'Patient', name: {given: 'James'}};
    let resource2 = {resourceType: 'Patient'};
    expect(filter(resource1)).toBeTruthy();
    expect(filter(resource2)).toBeTruthy();
    expect(filter({})).toBeFalsy();
  });

  test('should be able to create a filterMapper from json', () => {
    let buildFilterMappers = mapping.__get__('buildMappers');
    let filterJson = {filter: 'Patient.name',
                      exec: (resource) => {
                        resource.mapped = 'Its Mapped';
                        return resource;
                      }
                };
    let filterMapper = buildFilterMappers(filterJson);
    expect(filterMapper).toBeTruthy();
    let resource1 = {resourceType: 'Patient', name: {given: 'James'}};
    let resource2 = {resourceType: 'Patient'};
    expect(filterMapper.filter(resource1)).toBeTruthy();
    expect(filterMapper.filter(resource2)).toBeFalsy();
    let mapped = filterMapper.execute(resource1);
    expect(mapped.mapped).toBe('Its Mapped');

  });

  test('should be able to create a filterMapper with a context', () => {
    let buildFilterMappers = mapping.__get__('buildMappers');
    let filterJson = {filter: 'Condition.code.coding.where($this.code in %codes.first())',
                      exec: (resource) => {
                        resource.mapped = 'Its Mapped';
                        return resource;
                      }
                };
    let context = {'codes': ['1', '23232', '34343']};
    let filterMapper = buildFilterMappers(filterJson, context);
    expect(filterMapper).toBeTruthy();
    let resource1 = {resourceType: 'Condition', code: {coding: {code: '23232'}}};
    let resource2 = {resourceType: 'Condition', code: {coding: {code: 'hey'}}};
    expect(filterMapper.filter(resource1)).toBeTruthy();
    expect(filterMapper.filter(resource2)).toBeFalsy();
    let mapped = filterMapper.execute(resource1);
    expect(mapped.mapped).toBe('Its Mapped');

  });



  test('should be able to create a resourceMapper from json', () => {
    let resourceMapping = {
      filter: 'Patient',
      ignore: "Patient.meta.profile.where($this = 'something')",
      exclude: ["Patient.name.where($this.given = 'James')"],
      default: (resource, _context) => {
          resource.meta = {profile: ['some:uri:here']};
          return resource;
      },
      mappers: [
        {filter: "Patient.name.where($this.given = 'Bob')",
         exec: (resource, _context) => {
              resource.mapped = 'Its Mapped';
              return resource;
          }
        }
      ]
    };

    let ResourceTypeMapper = mapping.__get__('AggregateMapper');
    let rtm = new ResourceTypeMapper(resourceMapping);
    let resource1 = {resourceType: 'Patient', name: {given: 'James'}};
    let resource2 = {resourceType: 'Patient', meta: {profile: ['something']}};
    let resource3 = {resourceType: 'Patient', name: {given: 'Bob'}};
    let resource4 = {resourceType: 'Patient', name: {given: 'Steve'}};

    expect(rtm.ignore(resource1)).toBeFalsy();
    expect(rtm.exclude(resource1)).toBeTruthy();
    expect(rtm.execute(resource1)).toBe(null);

    expect(rtm.ignore(resource2)).toBeTruthy();
    expect(rtm.exclude(resource2)).toBeFalsy();
    expect(rtm.execute(resource2)).toBe(resource2);

    expect(rtm.ignore(resource3)).toBeFalsy();
    expect(rtm.exclude(resource3)).toBeFalsy();
    let mapped = rtm.execute(resource3);
    expect(mapped).toBeTruthy();
    expect(mapped.mapped).toBe('Its Mapped');
    expect(mapped.meta).toBeFalsy();

    expect(rtm.ignore(resource4)).toBeFalsy();
    expect(rtm.exclude(resource4)).toBeFalsy();
    mapped = rtm.execute(resource4);
    expect(mapped).toBeTruthy();
    expect(mapped.mapped).toBeFalsy();
    expect(mapped.meta.profile).toEqual(['some:uri:here']);

  });


  test('should be able to execute mapper with a context for addtional information', () => {
    let resourceMapping = {
      filter: 'Patient',
      ignore: "Patient.meta.profile.where($this = 'something')",
      exclude: ["Patient.name.where($this.given = 'James')"],
      default: (resource, _context = {}) => {
          resource.meta = {profile: ['some:uri:here']};
          return resource;
      },
      mappers: [
        {filter: "Patient.name.where($this.given = 'Bob')",
         exec: (resource, context = {}) => {
              if (context.mapBob){
                resource.mapped = 'Its Mapped';
                return resource;
              }
          }
        }
      ]
    };

    let ResourceTypeMapper = mapping.__get__('AggregateMapper');
    let rtm = new ResourceTypeMapper(resourceMapping);
    let james = {resourceType: 'Patient', name: {given: 'James'}};
    let bob = {resourceType: 'Patient', name: {given: 'Bob'}};


    let mapped = rtm.execute(james);
    expect(mapped).toBeFalsy();
    mapped = rtm.execute(bob);
    expect(mapped).toBeFalsy();
    mapped = rtm.execute(bob, {mapBob: false});
    expect(mapped).toBeFalsy();
    mapped = rtm.execute(bob, {mapBob: true});
    expect(mapped.mapped).toBeTruthy();

  });

    test('should be able to create a mapping engine from json', () => {
      let config = require('./mapping.test_config.js');
      let engine = new mapping.AggregateMapper(config);
      expect(engine).toBeTruthy();
    });
});
