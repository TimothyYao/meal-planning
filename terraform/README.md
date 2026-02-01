# Terraform Infrastructure for Meal Planner

This directory contains Terraform configuration for managing the Firebase infrastructure for the Meal Planner application.

## Prerequisites

1. **Terraform** - Install via Homebrew: `brew install hashicorp/tap/terraform`
2. **Google Cloud SDK** - Install via Homebrew: `brew install google-cloud-sdk`
3. **Authentication** - Run `gcloud auth application-default login`

## Project Structure

| File | Description |
|------|-------------|
| `versions.tf` | Terraform and provider version requirements |
| `variables.tf` | Input variable definitions |
| `terraform.tfvars` | Variable values (project-specific) |
| `main.tf` | Main resource definitions |
| `outputs.tf` | Output value definitions |

## Quick Start

### 1. Authenticate with Google Cloud

```bash
gcloud auth application-default login
gcloud auth application-default set-quota-project meal-planner-e9881
```

### 2. Initialize Terraform

```bash
cd terraform
terraform init
```

### 3. Review Changes

```bash
terraform plan
```

### 4. Apply Changes

```bash
terraform apply
```

## Managed Resources

| Resource | Type | Notes |
|----------|------|-------|
| Firebase Project | `meal-planner-e9881` | Main project |
| Firebase Web App | `meal-planning` | Web application |
| Firestore Database | `(default)` | Multi-region US (nam5) |

## Outputs

View current outputs:

```bash
terraform output
```

Available outputs:
- `project_id` - The Firebase project ID
- `web_app_id` - The Firebase Web App ID
- `firestore_database` - The Firestore database name
- `web_app_config` - Configuration object for the web app

## Important Notes

1. **State File**: The `terraform.tfstate` file contains sensitive information. It's gitignored but should be stored securely. Consider using remote state with GCS for team collaboration.

2. **Authentication**: Make sure you're authenticated with the Google account that has access to the Firebase project.

3. **Adding Resources**: To manage additional Firebase resources (Hosting, Cloud Functions, Storage, etc.), add them to `main.tf`.
