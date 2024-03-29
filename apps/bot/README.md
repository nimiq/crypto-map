# The Crypto Map Slack Bot

Manage the [Crypto Map](https://map.nimiq.com)

**Guide Outline**:

- [Supported Workflows](#supported-workflows)
- [Setup](#setup)
  - [Install the Slack CLI](#install-the-slack-cli)
  - [Clone the Sample App](#clone-the-sample-app)
  - [Register an OAuth App on GitHub](#register-an-oauth-app-on-github)
  - [Configure Outgoing Domains](#configure-outgoing-domains)
- [Create a Link Trigger](#create-a-link-trigger)
- [Running Your Project Locally](#running-your-project-locally)
- [Deploying Your App](#deploying-your-app)
  - [Viewing Activity Logs](#viewing-activity-logs)
- [Project Structure](#project-structure)
- [Resources](#resources)

---

## Supported Workflows

- **Delete location**
- **Create location**
- **Notify of an issue in a location**
- **Notify of a candidate in the Crypto Map**

## Setup

Before getting started, make sure you have a development workspace where you
have permissions to install apps. If you don’t have one set up, go ahead and
[create one](https://slack.com/create). Also, please note that the workspace
requires any of [the Slack paid plans](https://slack.com/pricing).

### Install the Slack CLI

To use this sample, you first need to install and configure the Slack CLI.
Step-by-step instructions can be found in our
[Quickstart Guide](https://api.slack.com/future/quickstart).

_Remember to login using `slack login` command_

### Clone the App

Start by cloning this repository:

```zsh
# Change into this project directory
cd crypto-map-bot
```

### Register a GitHub App

With [external authentication](https://api.slack.com/future/external-auth) you
can connect your GitHub account to your Slack app to easily access the GitHub
API from a custom function, creating a base for programmatic personalizations!

> Connecting your GitHub account with external auth allows your application to
> perform the API calls used by functions as though it was _from this GitHub
> account_. This means all issues created from the **Create GitHub issue**
> workflow will appear to have been created by the account used when
> authenticating.

#### Create an OAuth App on GitHub

Begin by creating a new OAuth App from your
[developer settings on GitHub](https://github.com/settings/developers) using any
**Application name** and **Homepage URL** you'd like, but leaving **Enable
Device Flow** unchecked.

The **Authorization callback URL** must be set to
`https://oauth2.slack.com/external/auth/callback` to later exchange tokens and
complete the OAuth2 handshake.

Once you're satisfied with these configurations, go ahead and click **Register
application**!

### Configure Outgoing Domains

Hosted custom functions must declare which
[outgoing domains](https://api.slack.com/future/manifest) are used when making
network requests, including Github API calls. `api.github.com` is already
configured as an outgoing domain in this sample's manifest. If your organization
uses a separate Github Enterprise to make API calls to, add that domain to the
`outgoingDomains` array in `manifest.ts`.

## Create a Link Trigger

[Triggers](https://api.slack.com/future/triggers) are what cause workflows to
run. These triggers can be invoked by a user, or automatically as a response to
an event within Slack.

A [link trigger](https://api.slack.com/future/triggers/link) is a type of
Trigger that generates a **Shortcut URL** which, when posted in a channel or
added as a bookmark, becomes a link. When clicked, the link trigger will run the
associated workflow.

Link triggers are _unique to each installed version of your app_. This means
that Shortcut URLs will be different across each workspace, as well as between
[locally run](#running-your-project-locally) and
[deployed apps](#deploying-your-app). When creating a trigger, you must select
the Workspace that you'd like to create the trigger in. Each Workspace has a
development version (denoted by `(local)`), as well as a deployed version.

To create a link trigger for the "Create New Issue" workflow, run the following
command:

```zsh
slack trigger create --trigger-def triggers/create_new_issue_shortcut.ts
```

After selecting a Workspace, the output provided will include the link trigger
Shortcut URL. Copy and paste this URL into a channel as a message, or add it as
a bookmark in a channel of the workspace you selected.

**Note: this link won't run the workflow until the app is either running locally
or deployed!** Read on to learn how to run your app locally and eventually
deploy it to Slack hosting.

## Running Your Project Locally

While building your app, you can see your changes propagated to your workspace
in real-time with `slack run`. In both the CLI and in Slack, you'll know an app
is the development version if the name has the string `(local)` appended.

> [!WARNING] Make sure to have a `.env` file

```zsh
# Run app locally
slack run

Connected, awaiting events
```

Once running, click the
[previously created Shortcut URL](#create-a-link-trigger) associated with the
`(local)` version of your app. This should start a workflow that opens a form
used to create a new GitHub issue!

To stop running locally, press `<CTRL> + C` to end the process.

## Deploying Your App

Once you're done with development, you can deploy the production version of your
app to Slack hosting using `slack deploy`:

```zsh
slack deploy
```

After deploying, [create a new link trigger](#create-a-link-trigger) for the
production version of your app (not appended with `(local)`). Once the trigger
is invoked, the workflow should run just as it did in when developing locally.

### Viewing Activity Logs

Activity logs for the production instance of your application can be viewed with
the `slack activity` command:

```zsh
slack activity
```

### Slack Collaborator

You will need to be in the collaborator list to develop the bot.

List all collaborators of an app

```zsh
slack collaborator list
```

Add a collaborator to your app

```zsh
slack collaborator add <slackbot@example.com>
```

Remove a collaborator to your app

```zsh
slack collaborator remove <slackbot@example.com>
```

## Project Structure

### `manifest.ts`

The [app manifest](https://api.slack.com/future/manifest) contains the app's
configuration. This file defines attributes like app name and description.

### `slack.json`

Used by the CLI to interact with the project's SDK dependencies. It contains
script hooks that are executed by the CLI and implemented by the SDK.

### `/functions`

[Functions](https://api.slack.com/future/functions) are reusable building blocks
of automation that accept inputs, perform calculations, and provide outputs.
Functions can be used independently or as steps in workflows.

### `/workflows`

A [workflow](https://api.slack.com/future/workflows) is a set of steps that are
executed in order. Each step in a Workflow is a function.

Workflows can be configured to run without user input or they can collect input
by beginning with a [form](https://api.slack.com/future/forms) before continuing
to the next step.

### `/triggers`

[Triggers](https://api.slack.com/future/triggers) determine when workflows are
executed. A trigger file describes a scenario in which a workflow should be run,
such as a user pressing a button or when a specific event occurs.

## Resources

To learn more about developing with the CLI, you can visit the following guides:

- [Creating a new app with the CLI](https://api.slack.com/future/create)
- [Configuring your app](https://api.slack.com/future/manifest)
- [Developing locally](https://api.slack.com/future/run)

To view all documentation and guides available, visit the
[Overview page](https://api.slack.com/future/overview).
