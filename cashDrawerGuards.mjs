export function isDrawerInUse(drawer) {
  return Boolean(drawer?.inUseBy || drawer?.currentShift);
}
