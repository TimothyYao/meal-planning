# Recipes Design

This document provides a comprehensive design for the recipes feature, including how to create foods, combine them into recipes, and use recipes for macro tracking.

## Overview

The recipes system enables users to:
1. **Create Foods** - Add individual food items with nutritional information
2. **Build Recipes** - Combine multiple foods into reusable recipes
3. **Track with Recipes** - Log recipes to daily meal tracking for macro monitoring

## Entity Relationships

The following diagram shows how the core entities relate to each other in the recipes and tracking system:

```mermaid
erDiagram
    UserProfile ||--o{ Recipe : creates
    UserProfile ||--o{ FoodItem : creates
    UserProfile ||--o{ DailyLog : has
    
    FoodItem ||--o{ RecipeIngredient : "used in"
    FoodItem ||--o{ MealFood : "used in"
    
    Recipe ||--|{ RecipeIngredient : contains
    Recipe {
        string id PK
        string name
        string description
        number servings
        MacroTargets macros
        number prepTime
        number cookTime
        string category
        string[] tags
        boolean isPublic
        string createdBy FK
        date createdAt
        date updatedAt
    }
    
    RecipeIngredient {
        string foodId FK
        number quantity
        string notes
    }
    
    FoodItem {
        string id PK
        string name
        string brand
        string barcode
        MacroTargets macros
        number servingSize
        string servingUnit
        string category
        string source
    }
    
    DailyLog ||--|{ Meal : contains
    DailyLog {
        string date PK
        MacroTargets totalMacros
        MacroTargets targetMacros
        number weight
        string notes
    }
    
    Meal ||--|{ MealFood : contains
    Meal {
        string id PK
        string name
        date timestamp
        MacroTargets macros
        string notes
        string recipeId FK
    }
    
    MealFood {
        string foodId FK
        number quantity
    }
    
    MacroTargets {
        number calories
        number protein
        number carbs
        number fat
    }
```

## Food Creation

### Food Sources

Foods can be added to the system from multiple sources:

```mermaid
flowchart TB
    subgraph Sources["Food Sources"]
        USDA["USDA FoodData Central"]
        OFF["Open Food Facts"]
        Barcode["Barcode Scan"]
        Manual["Manual Entry"]
    end
    
    subgraph Validation["Validation Layer"]
        Validate["Validate Nutrition Data"]
        Normalize["Normalize Units"]
        Calculate["Calculate Macros/100g"]
    end
    
    subgraph Storage["Storage"]
        LocalDB["Local Cache"]
        CloudDB["Cloud Database"]
    end
    
    USDA --> Validate
    OFF --> Validate
    Barcode --> OFF
    Manual --> Validate
    
    Validate --> Normalize
    Normalize --> Calculate
    Calculate --> LocalDB
    Calculate --> CloudDB
```

### Food Creation Flow

The following sequence diagram illustrates the food creation process:

```mermaid
sequenceDiagram
    actor User
    participant App as Mobile/Web App
    participant API as Backend API
    participant USDA as USDA API
    participant OFF as Open Food Facts
    participant DB as Database
    
    User->>App: Search for food or scan barcode
    
    alt Search by name
        App->>API: searchFood(query)
        API->>USDA: Search USDA database
        USDA-->>API: Return results
        API->>OFF: Search OFF database
        OFF-->>API: Return results
        API-->>App: Merged & deduplicated results
    else Scan barcode
        App->>API: lookupBarcode(code)
        API->>OFF: Lookup by barcode
        OFF-->>API: Return food data
        API-->>App: Food details
    end
    
    App->>User: Display food options
    User->>App: Select food or create custom
    
    alt Create custom food
        User->>App: Enter food details
        App->>App: Validate macro data
        App->>API: createFood(foodData)
        API->>DB: Save custom food
        DB-->>API: Food saved
        API-->>App: Food created
    else Select existing food
        App->>API: cacheFood(foodId)
        API->>DB: Save to user's food cache
    end
    
    App->>User: Food ready to use
```

### Food Data Validation

```mermaid
flowchart TD
    Start["Food Data Input"] --> CheckName{"Name provided?"}
    CheckName -->|No| ErrorName["Error: Name required"]
    CheckName -->|Yes| CheckServing{"Serving size > 0?"}
    
    CheckServing -->|No| ErrorServing["Error: Invalid serving"]
    CheckServing -->|Yes| CheckMacros{"Macros valid?"}
    
    CheckMacros -->|No| ErrorMacros["Error: Invalid macros"]
    CheckMacros -->|Yes| CalcCalories["Calculate calories"]
    
    CalcCalories --> ValidateCalories{"Calories match<br/>protein×4 + carbs×4 + fat×9<br/>±10%?"}
    
    ValidateCalories -->|No| WarnCalories["Warning: Calories may be incorrect"]
    ValidateCalories -->|Yes| Success["Food Valid"]
    WarnCalories --> Success
    
    Success --> Save["Save Food"]
```

## Recipe Creation

### Recipe Building Flow

```mermaid
flowchart TB
    subgraph Create["1. Create Recipe"]
        Start["Start New Recipe"] --> Name["Enter Name & Description"]
        Name --> Meta["Set Servings, Prep/Cook Time"]
        Meta --> Category["Select Category & Tags"]
    end
    
    subgraph Ingredients["2. Add Ingredients"]
        Category --> SearchFood["Search for Food"]
        SearchFood --> SelectFood["Select Food Item"]
        SelectFood --> SetQuantity["Set Quantity"]
        SetQuantity --> AddNotes["Add Notes (optional)"]
        AddNotes --> AddMore{"Add more<br/>ingredients?"}
        AddMore -->|Yes| SearchFood
        AddMore -->|No| Preview
    end
    
    subgraph Calculate["3. Calculate & Save"]
        Preview["Preview Recipe Macros"]
        Preview --> AdjustServings["Adjust Serving Count"]
        AdjustServings --> Instructions["Add Instructions (optional)"]
        Instructions --> Save["Save Recipe"]
    end
```

### Recipe Macro Calculation

The recipe macros are calculated as the sum of all ingredient macros, then divided by the number of servings:

```mermaid
flowchart LR
    subgraph Ingredients["Ingredients"]
        I1["Ingredient 1<br/>Food × Quantity"]
        I2["Ingredient 2<br/>Food × Quantity"]
        I3["Ingredient 3<br/>Food × Quantity"]
        IN["...Ingredient N"]
    end
    
    subgraph Calculation["Calculation"]
        Sum["Sum All Macros"]
        Divide["÷ Servings"]
    end
    
    subgraph Result["Per Serving"]
        Macros["Recipe Macros<br/>Calories, P, C, F"]
    end
    
    I1 --> Sum
    I2 --> Sum
    I3 --> Sum
    IN --> Sum
    Sum --> Divide
    Divide --> Macros
```

### Detailed Recipe Creation Sequence

```mermaid
sequenceDiagram
    actor User
    participant App as Mobile/Web App
    participant RecipeService as Recipe Service
    participant FoodService as Food Service
    participant DB as Database
    
    User->>App: Create new recipe
    App->>App: Initialize empty recipe
    
    User->>App: Enter name, description, servings
    
    loop Add Ingredients
        User->>App: Search for ingredient
        App->>FoodService: searchFoods(query)
        FoodService-->>App: Food results
        App->>User: Display food options
        
        User->>App: Select food & quantity
        App->>App: Add to ingredients list
        App->>App: Recalculate total macros
        App->>User: Show updated macros
    end
    
    User->>App: Add instructions (optional)
    User->>App: Save recipe
    
    App->>RecipeService: createRecipe(recipeData)
    RecipeService->>RecipeService: Validate recipe
    RecipeService->>RecipeService: Calculate per-serving macros
    RecipeService->>DB: Save recipe
    DB-->>RecipeService: Recipe saved
    RecipeService-->>App: Recipe created
    App->>User: Recipe saved successfully
```

### Recipe States

```mermaid
stateDiagram-v2
    [*] --> Draft: Create New
    
    Draft --> Draft: Add/Remove Ingredients
    Draft --> Draft: Edit Details
    Draft --> Validating: Save
    
    Validating --> Invalid: Validation Failed
    Validating --> Saved: Validation Passed
    
    Invalid --> Draft: Fix Issues
    
    Saved --> Editing: Edit Recipe
    Editing --> Validating: Save Changes
    Editing --> Saved: Cancel
    
    Saved --> Deleted: Delete
    Deleted --> [*]
    
    Saved --> Published: Make Public
    Published --> Saved: Make Private
```

## Using Recipes for Tracking

### Adding Recipe to Daily Log

```mermaid
flowchart TB
    subgraph Select["1. Select Recipe"]
        Browse["Browse Recipes"] --> Filter["Filter by Category/Tags"]
        Filter --> Search["Search Recipes"]
        Search --> SelectRecipe["Select Recipe"]
    end
    
    subgraph Customize["2. Customize Serving"]
        SelectRecipe --> ViewDetails["View Recipe Details"]
        ViewDetails --> SetServings["Set Number of Servings"]
        SetServings --> PreviewMacros["Preview Meal Macros"]
    end
    
    subgraph Log["3. Log to Meal"]
        PreviewMacros --> SelectMeal["Select Meal Type<br/>(Breakfast, Lunch, etc.)"]
        SelectMeal --> Confirm["Confirm & Log"]
        Confirm --> UpdateDaily["Update Daily Totals"]
    end
```

### Recipe to Meal Conversion

When a recipe is logged, it creates a meal with the recipe's ingredients:

```mermaid
flowchart LR
    subgraph Recipe["Recipe (2 servings)"]
        R_Name["Chicken Stir Fry"]
        R_Macros["Per Serving:<br/>400 cal, 35g P<br/>30g C, 15g F"]
        R_Ingredients["Ingredients:<br/>• Chicken 200g<br/>• Rice 150g<br/>• Vegetables 100g"]
    end
    
    subgraph Conversion["Conversion<br/>(1.5 servings)"]
        Multiply["Multiply by<br/>serving count"]
    end
    
    subgraph Meal["Logged Meal"]
        M_Name["Lunch: Chicken Stir Fry"]
        M_Macros["600 cal, 52.5g P<br/>45g C, 22.5g F"]
        M_Foods["Foods:<br/>• Chicken 300g<br/>• Rice 225g<br/>• Vegetables 150g"]
    end
    
    Recipe --> Conversion
    Conversion --> Meal
```

### Complete Tracking Flow Sequence

```mermaid
sequenceDiagram
    actor User
    participant App as Mobile/Web App
    participant RecipeService as Recipe Service
    participant TrackingService as Tracking Service
    participant DB as Database
    
    User->>App: Open daily log
    App->>TrackingService: getDailyLog(date)
    TrackingService->>DB: Fetch daily log
    DB-->>TrackingService: Daily log data
    TrackingService-->>App: Current log & progress
    
    User->>App: Add meal from recipe
    App->>RecipeService: getRecipes()
    RecipeService->>DB: Fetch user recipes
    DB-->>RecipeService: Recipe list
    RecipeService-->>App: Available recipes
    
    User->>App: Select recipe
    App->>RecipeService: getRecipeDetails(id)
    RecipeService-->>App: Full recipe with ingredients
    
    User->>App: Set serving count (e.g., 1.5)
    App->>App: Calculate meal macros
    App->>User: Preview meal macros
    
    User->>App: Confirm & log meal
    App->>TrackingService: logMeal(recipeId, servings, mealType)
    
    TrackingService->>TrackingService: Create meal from recipe
    TrackingService->>TrackingService: Calculate scaled macros
    TrackingService->>TrackingService: Update daily totals
    TrackingService->>DB: Save meal & update log
    
    DB-->>TrackingService: Saved
    TrackingService-->>App: Updated daily log
    App->>User: Show updated progress
```

### Daily Log Update Process

```mermaid
flowchart TB
    subgraph Input["New Meal Input"]
        Recipe["Recipe Selected"]
        Servings["Serving Count: 1.5"]
        MealType["Meal Type: Lunch"]
    end
    
    subgraph Process["Processing"]
        CreateMeal["Create Meal Record"]
        CalcMacros["Calculate Meal Macros"]
        FetchLog["Fetch Daily Log"]
        SumMeals["Sum All Meals"]
        UpdateTotals["Update Daily Totals"]
    end
    
    subgraph Output["Updated State"]
        DailyLog["Daily Log"]
        Progress["Macro Progress"]
        Remaining["Remaining Macros"]
    end
    
    Recipe --> CreateMeal
    Servings --> CalcMacros
    MealType --> CreateMeal
    CreateMeal --> CalcMacros
    CalcMacros --> FetchLog
    FetchLog --> SumMeals
    SumMeals --> UpdateTotals
    UpdateTotals --> DailyLog
    UpdateTotals --> Progress
    UpdateTotals --> Remaining
```

## Recipe Scaling

### Scaling Logic

```mermaid
flowchart TB
    subgraph Original["Original Recipe"]
        OS["Original Servings: 4"]
        OI["Ingredients at base quantities"]
        OM["Macros per serving"]
    end
    
    subgraph Scale["Scale Factor"]
        DS["Desired Servings: 6"]
        SF["Scale Factor = 6/4 = 1.5"]
    end
    
    subgraph Scaled["Scaled Recipe"]
        SI["All ingredient quantities × 1.5"]
        SM["Macros per serving unchanged"]
        TM["Total macros × 1.5"]
    end
    
    OS --> SF
    DS --> SF
    SF --> SI
    OI --> SI
    OM --> SM
    OM --> TM
    SF --> TM
```

### Scaling for Meal Prep

```mermaid
sequenceDiagram
    actor User
    participant App as Mobile/Web App
    participant RecipeService as Recipe Service
    participant ShoppingService as Shopping Service
    
    User->>App: Open recipe for meal prep
    App->>RecipeService: getRecipe(id)
    RecipeService-->>App: Recipe details
    
    User->>App: Set prep quantity (e.g., 10 servings)
    App->>App: Calculate scaled ingredients
    App->>User: Show scaled ingredient list
    
    User->>App: Generate shopping list
    App->>ShoppingService: createShoppingList(scaledIngredients)
    ShoppingService->>ShoppingService: Aggregate ingredients
    ShoppingService->>ShoppingService: Group by category
    ShoppingService-->>App: Shopping list
    
    App->>User: Display shopping list
```

## Complete System Overview

### End-to-End Data Flow

```mermaid
flowchart TB
    subgraph DataSources["Data Sources"]
        USDA["USDA Database"]
        OFF["Open Food Facts"]
        Custom["Custom Foods"]
    end
    
    subgraph FoodLayer["Food Layer"]
        FoodDB["Food Database"]
        FoodCache["Local Food Cache"]
    end
    
    subgraph RecipeLayer["Recipe Layer"]
        RecipeDB["Recipe Database"]
        RecipeCalc["Macro Calculator"]
    end
    
    subgraph TrackingLayer["Tracking Layer"]
        DailyLog["Daily Log"]
        MealLog["Meal Log"]
        MacroProgress["Macro Progress"]
    end
    
    subgraph UserInterface["User Interface"]
        FoodSearch["Food Search"]
        RecipeBuilder["Recipe Builder"]
        MealTracker["Meal Tracker"]
        Dashboard["Dashboard"]
    end
    
    USDA --> FoodDB
    OFF --> FoodDB
    Custom --> FoodDB
    FoodDB --> FoodCache
    
    FoodCache --> RecipeCalc
    RecipeCalc --> RecipeDB
    
    RecipeDB --> MealLog
    FoodCache --> MealLog
    MealLog --> DailyLog
    DailyLog --> MacroProgress
    
    FoodSearch --> FoodCache
    RecipeBuilder --> RecipeDB
    MealTracker --> MealLog
    Dashboard --> MacroProgress
```

### User Journey Map

```mermaid
journey
    title User Journey: From Food to Tracking
    section Create Food
      Search food database: 5: User
      Select or create food: 4: User
      Verify nutritional data: 3: User
    section Build Recipe
      Start new recipe: 5: User
      Add ingredients: 4: User
      Set quantities: 4: User
      Calculate macros: 5: System
      Save recipe: 5: User
    section Track Meals
      Open daily log: 5: User
      Select recipe: 5: User
      Choose serving size: 4: User
      Log to meal: 5: User
      View progress: 5: User
```

## API Endpoints

### Food Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/foods/search?q={query}` | Search foods by name |
| GET | `/foods/barcode/{code}` | Lookup food by barcode |
| GET | `/foods/{id}` | Get food details |
| POST | `/foods` | Create custom food |
| PUT | `/foods/{id}` | Update custom food |
| DELETE | `/foods/{id}` | Delete custom food |

### Recipe Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/recipes` | List user's recipes |
| GET | `/recipes/{id}` | Get recipe details |
| POST | `/recipes` | Create new recipe |
| PUT | `/recipes/{id}` | Update recipe |
| DELETE | `/recipes/{id}` | Delete recipe |
| POST | `/recipes/{id}/duplicate` | Duplicate recipe |
| GET | `/recipes/public` | Browse public recipes |

### Tracking Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/logs/{date}` | Get daily log |
| POST | `/logs/{date}/meals` | Add meal to log |
| PUT | `/logs/{date}/meals/{mealId}` | Update meal |
| DELETE | `/logs/{date}/meals/{mealId}` | Remove meal |
| POST | `/logs/{date}/meals/from-recipe` | Create meal from recipe |

## Data Calculations

### Macro Calculation Formulas

**Food Macros (per quantity):**
```
macros = food.macros × (quantity / food.servingSize)
```

**Recipe Macros (per serving):**
```
totalMacros = Σ(ingredient.food.macros × ingredient.quantity)
perServingMacros = totalMacros / recipe.servings
```

**Meal Macros (from recipe):**
```
mealMacros = recipe.perServingMacros × servingCount
```

**Daily Totals:**
```
dailyTotalMacros = Σ(meal.macros) for all meals
progress = (dailyTotalMacros / targetMacros) × 100
remaining = targetMacros - dailyTotalMacros
```

## Error Handling

### Common Error States

```mermaid
flowchart TD
    subgraph FoodErrors["Food Errors"]
        FE1["Food not found"]
        FE2["Invalid barcode"]
        FE3["Duplicate food"]
        FE4["Invalid macro data"]
    end
    
    subgraph RecipeErrors["Recipe Errors"]
        RE1["No ingredients"]
        RE2["Invalid serving count"]
        RE3["Missing required fields"]
        RE4["Circular reference"]
    end
    
    subgraph TrackingErrors["Tracking Errors"]
        TE1["Recipe not found"]
        TE2["Invalid serving count"]
        TE3["Log not found"]
        TE4["Offline - queued"]
    end
    
    FE1 --> CreateCustom["Prompt: Create custom food"]
    FE2 --> ManualEntry["Prompt: Manual entry"]
    FE3 --> Merge["Prompt: Merge or keep separate"]
    FE4 --> Correct["Prompt: Correct values"]
    
    RE1 --> AddIngredient["Prompt: Add ingredients"]
    RE2 --> FixServings["Default to 1 serving"]
    RE3 --> ShowRequired["Highlight required fields"]
    RE4 --> Block["Block save"]
    
    TE1 --> RefreshRecipes["Refresh recipe list"]
    TE2 --> ResetServings["Reset to default"]
    TE3 --> CreateLog["Create new log"]
    TE4 --> QueueAction["Queue for sync"]
```

## Related Documentation

- [Data Models](./data-models.md) - Core entity definitions
- [User Stories: Meal Planning](./user-stories/meal-planning.md) - Recipe management user stories
- [User Stories: Core Tracking](./user-stories/core-tracking.md) - Meal logging user stories
- [Architecture](./architecture.md) - Technical architecture overview
