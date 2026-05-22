## Pages

- `index.html` — recipe grid with sidebar filters (cuisine, main ingredient/diet, nutrients) and search
- `guidelines.html` — dietary guidelines reference
- `add.html` — add/edit form (auth-gated)

## One-time setup

### 1. Create a Firebase project

1. Go to [console.firebase.google.com](https://console.firebase.google.com), click **Add project**.
2. Give it a name (e.g. `recipe-organizer`). Disable Google Analytics if asked — not needed.
3. In the project, click the **Web** icon (`</>`) to add a web app. Give it a nickname; you don't need Firebase Hosting.
4. Copy the `firebaseConfig` snippet shown.

### 2. Enable Firestore

1. In the Firebase console sidebar, go to **Build → Firestore Database → Create database**.
2. Pick **Production mode** (we'll add our own rules below).
3. Choose a region close to you.

### 3. Enable Google sign-in

1. In the sidebar, go to **Build → Authentication → Get started**.
2. **Sign-in method** tab → click **Google** → toggle **Enable** → Save.

### 4. Firestore security rules

In **Firestore Database → Rules**, replace the rules with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /recipes/{id} {
      allow read: if true;
      allow write: if request.auth != null
        && request.auth.token.email == "alexander.c.mayer@gmail.com";
    }
  }
}
```

Click **Publish**. If your email differs from `alexander.c.mayer@gmail.com`, change both this rule **and** the `OWNER_EMAIL` constant in `js/firebase-config.js`.

### 5. Paste the Firebase config

Open `js/firebase-config.js` and replace the placeholder values with the snippet you copied in step 1.

The API key and project ID are **public values** (Firestore rules enforce security on the server). It's safe to commit them.

### 6. Push to GitHub

```bash
cd C:\Users\alexa\Documents\Claude\Projects\recipe-organizer
git init
git add .
git commit -m "Initial recipe organizer"
gh repo create recipe-organizer --public --source=. --push
```

(Or create the repo through the GitHub UI and push manually.)

### 7. Enable GitHub Pages

In the repo on GitHub: **Settings → Pages**.
- Source: **Deploy from a branch**
- Branch: **main** / root
- Save. GitHub shows your URL — usually `https://<your-username>.github.io/recipe-organizer/`.

### 8. Authorize the GitHub Pages domain in Firebase

In Firebase: **Authentication → Settings → Authorized domains → Add domain**.
- Add `<your-username>.github.io`.

### 9. Seed the initial 18 recipes

1. Open your live site in a browser.
2. Click **Sign in** in the top-right; sign in with your Google account.
3. Click **+ Add recipe**.
4. A yellow "Initial seed" callout appears with a **Seed initial recipes** button. Click it. The 18 starter recipes from `data/seed-recipes.json` are written to Firestore in one batched write.
5. Navigate back to the home page — the recipes appear.

The seed button is idempotent: it refuses to run if the collection is not empty.

## Daily use

- **Browse**: open the site, filter or search.
- **Add a recipe**: click **+ Add recipe** (visible only when signed in as owner), fill the form, submit.
- **Edit/delete**: each recipe card shows Edit/Delete buttons when you're signed in.
- **Cross-device**: changes propagate live via Firestore's `onSnapshot` — no refresh needed.

## Schema

```js
{
  name: string,
  url: string,
  source: string,
  cuisine: string,                      // free-form
  protein: "chicken" | "turkey" | "eggs" | "tofu" | "none",
  dietaryTags: string[],                // ["vegetarian"], ["vegetarian","vegan"], or []
  timeMinutes: number,
  notes: string,
  nutrients: string[],                  // see js/constants.js for the canonical list
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

The **"Main ingredient / diet"** sidebar filter combines `protein` and `dietaryTags` — a recipe matches the "Vegetarian" chip if it has a vegetarian/vegan tag **or** has `protein` in `{eggs, tofu}`.

## Local development

Because the JS uses native ES modules, you need to serve over HTTP — don't open `index.html` with `file://`.

The quickest option on Windows:

```powershell
cd C:\Users\alexa\Documents\Claude\Projects\recipe-organizer
python -m http.server 8000
```

Then visit http://localhost:8000.

Add `http://localhost:8000` (and `localhost`) to **Firebase → Authentication → Authorized domains** so sign-in works locally.

## Files

```
index.html              # Recipes grid + filters
guidelines.html         # Dietary guidelines reference
add.html                # Add/edit form (auth-gated)
css/styles.css          # Mobile-first styles
js/
  firebase-config.js    # Paste your Firebase config here
  firebase-init.js      # SDK initialization
  auth.js               # Google sign-in + owner gate
  recipes.js            # Firestore CRUD + live subscription
  filters.js            # Search + filter logic
  render.js             # Recipe card rendering
  app.js                # index.html glue
  add-form.js           # add.html glue
  seed.js               # One-time seed button
  constants.js          # Cuisine / protein / nutrient lists
data/
  seed-recipes.json     # 18 starter recipes
```
