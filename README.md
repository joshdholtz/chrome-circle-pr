# ![](icon48.png) CirclePR
`CirclePR` is an unofficial Chrome Extension for CircleCI (https://circleci.com/). It sends a parameterized build to your CircleCI project from the push of a button while viewing your Pull Request on Github. You can also view your most recent builds in a Github repository and for a PR.

[Get it on the Chrome Web Store :fist:](https://chrome.google.com/webstore/detail/circlepr-for-circleci/hcinmdnhmbfnfaaodeehiipiaekdkjhj)

## Example Usage

### Managing CircleCI from your project's Github page
Don't let your build queue get too big when you are making a lot of changes right in a row. Just pop open `CirclePR` and cancel any unnecessary builds without having to go search for them in CircleCI's dashboard.

### Distrubuting builds
Use the extension to kick off a build of a new feature for an iOS app to CircleCI. CircleCI builds the iOS project using Fastlane and then sends the new build to HockeyApp for your client, stakeholders, or QA team to test.

## Setup

All you need to do is to make sure that you set the correct configurations in your plugin :blush: The configuration is a simple JSON object where the key are in the format of "owner/repo" and the values are the CircleCI API tokens.

```json
{ "RokkinCat/gym-oclock-ios": "my-super-secret-token" }
```

![](screenshots/screenshot_9.png)

## The Process
Your build is only a few simple steps away :raised_hands:

### Step 1 - Navigate to Github Pull Request
![](screenshots/screenshot_0.png)

### Step 2 - Click the CirclePR button
![](screenshots/screenshot_1.png)

### Step 3 - Click the "Make build for PR #" button
The new build will be started and shown in the extension window
![](screenshots/screenshot_1.5.png)

### Step 4 - Click the "View" button
Admire it
![](screenshots/screenshot_2.png)

## Using Custom Build parameters (Optional)
Sometimes you may want to send up custom build parameters to build for a different environment (or whatever else you may dream up). `CirclePR` makes this pretty painless (except for the writing of a JSON string :wink:)

### Enter build parameters as a JSON string
![](screenshots/screenshot_4.png)

### View build parameters in CircleCI build
![](screenshots/screenshot_5.png)
