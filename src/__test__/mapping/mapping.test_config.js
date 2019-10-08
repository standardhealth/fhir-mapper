
const setProfile = (resource, profile) =>{
  resource.meta = (resource.meta || {});
  resource.meta.profile = (resource.meta.profile || []);
  resource.meta.profile.push(profile);
};

module.export = {
  ignore: null,
  exclude: null,
  default: null,
  mappers: {
    'Patient': {
      default: (resource) => setProfile(resource, ''),
      mappers: [
        {
          filter: "gender = 'male'",
          exec: (resource) => {resource.gender = 'Male'; return resource;}
        }
      ]
    },
    'Observation': {
      default: (resource) => setProfile(resource, '')
    },
    'Condition': {
      default: (resource) => setProfile(resource, '')
    },
    'Device': {
      default: (resource) => setProfile(resource, '')
    },
    'Procedure': {
      default: (resource) => setProfile(resource, '')
    },
    'MedicationAdministration': {
      default: (resource) => setProfile(resource, '')
    },
    'MedicationRequest': {
      default: (resource) => setProfile(resource, '')
    }

  }

};
