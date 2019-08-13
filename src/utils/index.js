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

module.exports = {applyProfile, addExtension};
