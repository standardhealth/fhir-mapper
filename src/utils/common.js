const fhirpath = require('fhirpath');
const _ = require('lodash');

const applyProfile = (resource, profile) => {
    if (profile) {
        resource.meta = resource.meta || {};
        resource.meta.profile = resource.meta.profile || [];
        resource.meta.profile.unshift(profile); // ensure this profile is first in the list
    }
    return resource;
};

const addExtension = (resource, newExtension) => {
  resource.extension = resource.extension || [];
  resource.extension.push(newExtension);
};

const hasProfileFromList = (resource, profiles) => {
  // ignore resources that already have mCODE profiles. we will assume they are profiled correctly
  if (!resource || !resource.meta || !resource.meta.profile) {
      return false; // i.e., do not ignore this since it has no profiles
  }
  // check if any of the profiles are mcode. returns null (falsy) if none found or the profile itself (truthy)
  return resource.meta.profile.find(p => profiles.includes(p));
};

const applyProfileFunction = (profile) => {
    // return an anonymous function wrapper to apply this specific profile to given resources
    return (resource, _context) => applyProfile(resource, profile);
};

const addRelated = (resource, type, from) =>{
  if (!resource || !type || !from) {return;}
  resource.related = resource.related || [];
  resource.related.push({
    type: type,
    target: {
      reference: from.resourceType + '/' + from.id
    }
  });
};

// FHIRPath helper. FHIRPath tends to return things that are JS truthy (like empty arrays)
// when we would expect a null or other falsy value instead
// TODO: reference the same function here and in mapper
const isTrue = (arg) => {
  if (Array.isArray(arg) ){
    return arg.find(i => isTrue(i));
  } else if (typeof arg === 'object'){
    return !_.isEmpty(arg);
  } else if (typeof arg === 'string' && arg === 'false'){
    return false;
  }
  return arg;
};

const find = (context, path, options = {}) => {
    if (typeof context === 'object' && context.entry) {
       // extract the entries from the bundle
       context = context.entry.map(e => e.resource);
       // otherwise assume it's an array of resources anyway
   }

   if (typeof path === 'string') {
       path = fhirpath.compile(path, options);
   }

   const results = context.filter( r => isTrue( path(r) ) );
   if (results.length === 0) {
       return null;
   }

   // TODO: use options to figure out which one, if there are multiple
   return results[0];
 };

module.exports = {find, applyProfile, addExtension, hasProfileFromList, applyProfileFunction, isTrue, addRelated};
