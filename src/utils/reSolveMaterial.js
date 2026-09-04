export function getMaterialNames(containerMaterials, allMaterials) {
  return containerMaterials
    .map(cm => {
      const match = allMaterials.find(m => m.id === cm.Id);
      return match ? match.name : null;
    })
    .filter(Boolean)
    .join(", ");
}