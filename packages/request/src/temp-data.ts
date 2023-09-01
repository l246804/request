import type { RequestContext } from './context'

export function createTempData(ctx: RequestContext<any, any[]>) {
  const { getOptions, getState, mutateState } = ctx
  let tempData = getState().data

  const sync = () => {
    const data = getState().data
    const valid = getOptions().dataComparer(tempData, data)
    if (!valid) mutateState({ data })
  }

  const removeHook = ctx.hooks.hook('stateChange', (state) => {
    if ('data' in state) tempData = state.data
  })

  return () => {
    removeHook()
    sync()
    tempData = null
  }
}
