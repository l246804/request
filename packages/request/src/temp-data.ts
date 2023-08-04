import type { RequestContext } from '.'

export function createTempData(ctx: RequestContext<any, any[]>) {
  const { getOptions, getState, mutateState } = ctx
  let tempData = getState().data

  const sync = async () => {
    const data = getState().data
    const valid = await getOptions().dataCompare(tempData, data)
    if (!valid) mutateState({ data })
  }

  const removeHook = ctx.hooks.hook('stateChange', (state) => {
    if ('data' in state) tempData = state.data
  })

  return async () => {
    removeHook()
    await sync()
    tempData = null
  }
}
