export function createRawData() {
  let rawData
  return {
    set: (data) => {
      rawData = data
    },
    get: () => rawData,
  }
}
