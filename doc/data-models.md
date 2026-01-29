# Data Models

This document describes the core data models and entities used in the Macro Planning App.

## Core Entities

### UserProfile
User information, goals, and preferences.

**Fields:**
- `id`: string (unique identifier)
- `name`: string
- `email`: string
- `age`: number (optional)
- `height`: number (optional, in cm)
- `weight`: number (optional, in kg)
- `activityLevel`: 'sedentary' | 'light' | 'moderate' | 'active' | 'very-active' (optional)
- `goal`: 'lose' | 'maintain' | 'gain' (optional)
- `targetMacros`: MacroTargets

**Relationships:**
- Has many DailyLogs
- Has many Recipes
- Has many MealPlans

---

### MacroTargets
Macro nutrient targets for a day or meal.

**Fields:**
- `calories`: number
- `protein`: number (in grams)
- `carbs`: number (in grams)
- `fat`: number (in grams)

**Usage:**
- Daily targets for users
- Per-meal targets
- Food item macros per serving

---

### FoodItem
Food database entries with nutritional information.

**Fields:**
- `id`: string (unique identifier)
- `name`: string
- `brand`: string (optional)
- `barcode`: string (optional, UPC/EAN)
- `macros`: MacroTargets (per serving)
- `servingSize`: number (in grams)
- `servingUnit`: string (e.g., "g", "ml", "piece", "cup")
- `tags`: string[] (optional, e.g., ["protein", "meat", "poultry", "aisle:meat"])
- `imageUrl`: string (optional)
- `source`: string (optional, e.g., "USDA", "OpenFoodFacts", "user")

**Tag Conventions:**
- Food type tags: `protein`, `vegetable`, `grain`, `dairy`, `fruit`
- Shopping aisle tags: `aisle:produce`, `aisle:meat`, `aisle:dairy`, `aisle:frozen`
- Dietary tags: `vegan`, `vegetarian`, `gluten-free`, `keto`

**Relationships:**
- Used in many Meals (via MealFood)
- Can be in many Recipes

---

### Meal
A collection of foods consumed at a specific time.

**Fields:**
- `id`: string (unique identifier)
- `name`: string (e.g., "Breakfast", "Lunch", "Dinner", "Snack")
- `foods`: MealFood[] (array of foods with quantities)
- `timestamp`: Date
- `macros`: MacroTargets (calculated from foods)
- `notes`: string (optional)

**Relationships:**
- Belongs to DailyLog
- Contains many MealFoods
- Can be saved as Recipe

---

### MealFood
A food item within a meal with specific quantity. This is a denormalized log entry that embeds the food data directly.

**Fields:**
- `food`: FoodItem (embedded snapshot of the food at time of logging)
- `quantity`: number (multiplier of servingSize)
- `addedAt`: Date (optional, timestamp when food was added to the meal)

**Note:** The `food` field embeds a complete snapshot of the FoodItem data at the time of logging. This denormalization means:
- Log entries are self-contained and immutable
- Changes to the original food definition don't affect historical logs
- No referential integrity concerns if the original food is deleted
- The `addedAt` timestamp uniquely identifies each entry for reordering and deletion

**Calculations:**
- Actual macros = food.macros × quantity

---

### DailyLog
Daily meal tracking and macro totals.

**Fields:**
- `date`: string (YYYY-MM-DD format)
- `meals`: Meal[] (array of meals for the day)
- `totalMacros`: MacroTargets (sum of all meals)
- `targetMacros`: MacroTargets (user's daily targets)
- `weight`: number (optional, logged weight for the day)
- `notes`: string (optional)

**Relationships:**
- Belongs to UserProfile
- Has many Meals

**Calculations:**
- `totalMacros` = sum of all meal.macros
- Progress = (totalMacros / targetMacros) × 100

---

### Recipe
Saved recipes with ingredients that can be reused.

**Fields:**
- `id`: string (unique identifier)
- `name`: string
- `description`: string (optional)
- `ingredients`: RecipeIngredient[] (array of ingredients)
- `instructions`: string[] (optional, step-by-step instructions)
- `servings`: number (default serving count)
- `macros`: MacroTargets (calculated per serving)
- `prepTime`: number (optional, in minutes)
- `cookTime`: number (optional, in minutes)
- `imageUrl`: string (optional)
- `tags`: string[] (optional, e.g., ["breakfast", "dinner", "vegan", "high-protein", "meal-prep"])
- `isPublic`: boolean (default: false)
- `createdBy`: string (user ID)
- `createdAt`: Date
- `updatedAt`: Date

**Relationships:**
- Belongs to UserProfile
- Can be used in MealPlans
- Can be converted to Meal

---

### RecipeIngredient
An ingredient within a recipe. Structure mirrors MealFood for consistency.

**Fields:**
- `foodId`: string (reference to FoodItem)
- `food`: FoodItem (embedded snapshot for denormalization)
- `quantity`: number (multiplier of servingSize)
- `notes`: string (optional, e.g., "chopped", "diced")
- `addedAt`: Date (optional)

**Note:** The `food` field embeds a snapshot of the FoodItem data at the time the ingredient was added. This denormalization avoids N+1 reads when loading recipes in Firestore.

---

### MealPlan
Planned meals for future dates.

**Fields:**
- `id`: string (unique identifier)
- `name`: string (optional, e.g., "Week 1 Meal Plan")
- `startDate`: string (YYYY-MM-DD)
- `endDate`: string (YYYY-MM-DD)
- `plannedMeals`: PlannedMeal[] (meals planned for specific dates)
- `createdBy`: string (user ID)
- `createdAt`: Date
- `updatedAt`: Date

**Relationships:**
- Belongs to UserProfile
- Contains many PlannedMeals

---

### PlannedMeal
A meal planned for a specific date.

**Fields:**
- `date`: string (YYYY-MM-DD)
- `mealName`: string (e.g., "Breakfast", "Lunch")
- `recipeId`: string (optional, reference to Recipe)
- `recipe`: Recipe (optional, populated reference)
- `mealId`: string (optional, reference to saved Meal)
- `meal`: Meal (optional, populated reference)
- `notes`: string (optional)

**Relationships:**
- Belongs to MealPlan
- References Recipe or Meal

---

### ShoppingList
Generated shopping lists from meal plans.

**Fields:**
- `id`: string (unique identifier)
- `name`: string
- `items`: ShoppingListItem[]
- `mealPlanId`: string (optional, reference to MealPlan)
- `createdAt`: Date
- `updatedAt`: Date

**Relationships:**
- Belongs to UserProfile
- Can reference MealPlan

---

### ShoppingListItem
An item on a shopping list.

**Fields:**
- `foodId`: string (reference to FoodItem)
- `food`: FoodItem (populated reference)
- `quantity`: number (total quantity needed)
- `unit`: string (e.g., "g", "kg", "pieces")
- `category`: string (optional, for grouping, e.g., "produce", "dairy")
- `isChecked`: boolean (default: false)
- `notes`: string (optional)

---

## Food Sharing Models

### FoodShare
Represents a sharing permission granted to another user for a food item.

**Fields:**
- `id`: string (unique identifier)
- `foodId`: string (reference to the shared food)
- `ownerId`: string (user ID of the food owner)
- `sharedWithUserId`: string (user ID of the recipient)
- `sharedWithEmail`: string (optional, email used for sharing)
- `permission`: 'view' | 'copy' (permission level)
- `status`: 'pending' | 'active' | 'revoked'
- `createdAt`: Date
- `updatedAt`: Date
- `expiresAt`: Date (optional, expiration date)
- `note`: string (optional, message from the sharer)

**Relationships:**
- Belongs to UserProfile (owner)
- References FoodItem
- References UserProfile (recipient)

---

### ShareInvite
A shareable invite code for foods that can be used by multiple users.

**Fields:**
- `id`: string (unique identifier)
- `code`: string (unique 8-character invite code)
- `ownerId`: string (user ID of the inviter)
- `ownerEmail`: string (optional, email of the inviter)
- `ownerDisplayName`: string (optional, display name of the inviter)
- `foodIds`: string[] (foods included in the invite)
- `permission`: 'view' | 'copy' (permission level)
- `status`: 'pending' | 'accepted' | 'expired' | 'revoked'
- `maxUses`: number (maximum uses allowed)
- `useCount`: number (current use count)
- `usedBy`: string[] (user IDs who have used this invite)
- `createdAt`: Date
- `expiresAt`: Date

**Relationships:**
- Belongs to UserProfile (owner)
- References multiple FoodItems

---

### SharedFoodAccess
Denormalized view of a shared food stored in the recipient's subcollection.

**Fields:**
- `id`: string (same as foodId)
- `foodId`: string (reference to the original food)
- `ownerId`: string (user ID of the food owner)
- `ownerEmail`: string (optional, owner's email)
- `ownerDisplayName`: string (optional, owner's display name)
- `food`: FoodItem (embedded snapshot)
- `permission`: 'view' | 'copy'
- `sharedAt`: Date
- `expiresAt`: Date (optional)

**Relationships:**
- Belongs to UserProfile (recipient)
- References FoodItem (embedded)
- References UserProfile (owner)

**Note:** This denormalized structure allows efficient querying of shared foods without requiring joins or multiple document reads.

---

## Additional Models (Future)

### ProgressEntry
Weight and body measurement tracking.

**Fields:**
- `id`: string
- `userId`: string
- `date`: string (YYYY-MM-DD)
- `weight`: number (in kg)
- `bodyFat`: number (optional, percentage)
- `muscleMass`: number (optional, in kg)
- `measurements`: BodyMeasurements (optional)
- `notes`: string (optional)

### BodyMeasurements
Body measurement data.

**Fields:**
- `chest`: number (optional, in cm)
- `waist`: number (optional, in cm)
- `hips`: number (optional, in cm)
- `thigh`: number (optional, in cm)
- `arm`: number (optional, in cm)

### Challenge
Community challenge participation.

**Fields:**
- `id`: string
- `name`: string
- `description`: string
- `startDate`: Date
- `endDate`: Date
- `participants`: string[] (user IDs)
- `rules`: ChallengeRule[]

### Notification
User notifications and reminders.

**Fields:**
- `id`: string
- `userId`: string
- `type`: 'reminder' | 'achievement' | 'social' | 'system'
- `title`: string
- `message`: string
- `read`: boolean
- `createdAt`: Date

## Data Relationships Diagram

```
UserProfile
  ├── has many DailyLogs
  ├── has many Recipes
  ├── has many MealPlans
  ├── has many ShoppingLists
  ├── has many FoodShares (outgoing)
  ├── has many SharedFoodAccess (incoming)
  └── has many ShareInvites

DailyLog
  ├── belongs to UserProfile
  └── has many Meals

Meal
  ├── belongs to DailyLog
  └── has many MealFoods

MealFood
  └── references FoodItem

Recipe
  ├── belongs to UserProfile
  └── has many RecipeIngredients

RecipeIngredient
  └── references FoodItem

MealPlan
  ├── belongs to UserProfile
  └── has many PlannedMeals

PlannedMeal
  ├── belongs to MealPlan
  ├── references Recipe (optional)
  └── references Meal (optional)

ShoppingList
  ├── belongs to UserProfile
  ├── references MealPlan (optional)
  └── has many ShoppingListItems

ShoppingListItem
  └── references FoodItem

FoodShare
  ├── belongs to UserProfile (owner)
  ├── references UserProfile (recipient)
  └── references FoodItem

ShareInvite
  ├── belongs to UserProfile (owner)
  └── references many FoodItems

SharedFoodAccess
  ├── belongs to UserProfile (recipient)
  ├── references UserProfile (owner)
  └── embeds FoodItem (snapshot)
```
