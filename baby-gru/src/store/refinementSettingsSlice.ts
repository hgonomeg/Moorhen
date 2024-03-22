import { createSlice } from '@reduxjs/toolkit'

export const refinementSettings = createSlice({
  name: 'refinementSettings',
  initialState: {
    enableRefineAfterMod: null,
    animateRefine: null,
    useRamaRefinementRestraints: false,
    useTorsionRefinementRestraints: false,
    refinementSelection: 'TRIPLE',
  },
  reducers: {
    setRefinementSelection: (state, action: {payload: 'SINGLE' | 'TRIPLE' | 'SPHERE', type: string}) => {
      return {...state, refinementSelection: action.payload}
    },
    setAnimateRefine: (state, action: {payload: boolean, type: string}) => {
      return {...state, animateRefine: action.payload}
    },
    setEnableRefineAfterMod: (state, action: {payload: boolean, type: string}) => {
        return {...state, enableRefineAfterMod: action.payload}
    },
    setUseRamaRefinementRestraints: (state, action: {payload: boolean, type: string}) => {
        return {...state, useRamaRefinementRestraints: action.payload}
    },
    setuseTorsionRefinementRestraints: (state, action: {payload: boolean, type: string}) => {
        return {...state, useTorsionRefinementRestraints: action.payload}
    },  
}})

export const { 
  setAnimateRefine, setEnableRefineAfterMod, setUseRamaRefinementRestraints, 
  setuseTorsionRefinementRestraints, setRefinementSelection
} = refinementSettings.actions

export default refinementSettings.reducer