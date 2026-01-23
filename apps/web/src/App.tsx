import { useState } from 'react'
import { MacroTargets, formatMacroValue, DailyLog } from '@meal-planning/shared'
import './App.css'

function App() {
  const [targetMacros] = useState<MacroTargets>({
    calories: 2000,
    protein: 150,
    carbs: 200,
    fat: 65,
  })

  return (
    <>
      <div>
        <h1>Meal Planning Dashboard</h1>
        <div className="card">
          <h2>Daily Macro Targets</h2>
          <p>Calories: {formatMacroValue(targetMacros.calories, 'calories')}</p>
          <p>Protein: {formatMacroValue(targetMacros.protein, 'grams')}</p>
          <p>Carbs: {formatMacroValue(targetMacros.carbs, 'grams')}</p>
          <p>Fat: {formatMacroValue(targetMacros.fat, 'grams')}</p>
        </div>
        <p className="read-the-docs">
          Web dashboard for meal planning and macro tracking
        </p>
      </div>
    </>
  )
}

export default App
