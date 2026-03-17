# DataHarmony Automation Hub

## Overview
DataHarmony Automation Hub is a centralized portal for managing and executing operational routines, monitoring jobs, and accessing various automation modules across different domains.

## Modules

### Home
The home page provides an overview of the portal, displaying recent routines and jobs. It serves as the main dashboard.

**Route:** `/`

### Geology & Geophysics
This module contains tools for geological and geophysical operations.

**Routes:**
- `/routines` - Browse and execute available routines
- `/jobs` - View and monitor job execution status
- `/settings` - Configure system settings like OW_HOME and workspace paths

**Key Features:**
- Run routines with custom parameters
- Upload files for routine processing
- Monitor job execution in real-time
- View job logs (stdout and stderr)
- Download job artifacts and outputs
- Configure environment variables and paths

**Typical Actions:**
- Select a routine from the catalog
- Fill in required parameters
- Upload input files
- Submit the job
- Monitor job status
- View logs and download results

### Production
The Production module manages production-related operations and workflows.

**Route:** `/production`

### Drilling
The Drilling module handles drilling operations and access management.

**Routes:**
- `/drilling` - Main drilling operations page
- `/drilling/event-unlock` - Manage event unlock settings
- `/drilling/user-access` - Manage user access permissions for drilling operations

**Key Features:**
- Event unlock management
- User access control for drilling operations

### Cartography
The Cartography module manages mapping and cartographic projects.

**Routes:**
- `/cartography` - Main cartography page
- `/cartography/projects-index` - Browse and manage cartography projects
- `/cartography/cultural-info` - Manage cultural information and resources

**Key Features:**
- Project management
- Cultural information management

### Data Quality
The Data Quality module provides tools for monitoring and managing data quality across systems.

**Route:** `/data-quality`

**Key Features:**
- Data quality monitoring
- Quality metrics and reports

### Chatbot
Interactive chatbot interface for getting help and information about the portal.

**Route:** `/chat`

## Common Workflows

### Running a Routine
1. Navigate to `/routines`
2. Select a routine from the catalog
3. Fill in required parameters
4. Upload any required input files
5. Click submit to start the job
6. Monitor progress at `/jobs`

### Viewing Job Logs
1. Navigate to `/jobs`
2. Click on a job to view details
3. Switch between stdout and stderr tabs
4. Logs auto-scroll and update in real-time

### Configuring Settings
1. Navigate to `/settings`
2. Update environment variables like OW_HOME
3. Configure workspace paths
4. Save changes
