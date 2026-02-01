output "project_id" {
  description = "The Firebase project ID"
  value       = var.project_id
}

output "web_app_id" {
  description = "The Firebase Web App ID"
  value       = google_firebase_web_app.web.app_id
}

output "firestore_database" {
  description = "The Firestore database name"
  value       = google_firestore_database.default.name
}

# Web App Config - use this in your web application
output "web_app_config" {
  description = "Firebase configuration for the web app"
  value = {
    project_id = var.project_id
    app_id     = google_firebase_web_app.web.app_id
  }
}
