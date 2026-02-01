# =============================================================================
# Firebase Project (existing - will be imported)
# =============================================================================

resource "google_firebase_project" "default" {
  provider = google-beta
  project  = var.project_id
}

# =============================================================================
# Firebase Web App (existing - will be imported)
# =============================================================================

resource "google_firebase_web_app" "web" {
  provider     = google-beta
  project      = var.project_id
  display_name = "meal-planning"

  depends_on = [google_firebase_project.default]
}

# =============================================================================
# Firestore Database (existing - will be imported)
# =============================================================================

resource "google_firestore_database" "default" {
  provider                    = google-beta
  project                     = var.project_id
  name                        = "(default)"
  location_id                 = "nam5"  # Multi-region US - matches existing database
  type                        = "FIRESTORE_NATIVE"
  concurrency_mode            = "PESSIMISTIC"  # Matches existing database
  app_engine_integration_mode = "DISABLED"

  depends_on = [google_firebase_project.default]
}

# =============================================================================
# Firestore Security Rules
# =============================================================================

resource "google_firebaserules_ruleset" "firestore" {
  provider = google-beta
  project  = var.project_id

  source {
    files {
      content = file("${path.module}/firestore.rules")
      name    = "firestore.rules"
    }
  }

  lifecycle {
    create_before_destroy = true
  }

  depends_on = [google_firebase_project.default]
}

resource "google_firebaserules_release" "firestore" {
  provider     = google-beta
  project      = var.project_id
  name         = "cloud.firestore"
  ruleset_name = google_firebaserules_ruleset.firestore.name

  depends_on = [google_firebase_project.default]
}

# =============================================================================
# Firebase Storage Security Rules
# =============================================================================

resource "google_firebaserules_ruleset" "storage" {
  provider = google-beta
  project  = var.project_id

  source {
    files {
      content = file("${path.module}/storage.rules")
      name    = "storage.rules"
    }
  }

  lifecycle {
    create_before_destroy = true
  }

  depends_on = [google_firebase_project.default]
}

resource "google_firebaserules_release" "storage" {
  provider     = google-beta
  project      = var.project_id
  name         = "firebase.storage/meal-planner-e9881.firebasestorage.app"
  ruleset_name = google_firebaserules_ruleset.storage.name

  depends_on = [google_firebase_project.default]
}
