/* eslint no-console: 0 */
import inquirer from 'inquirer';
import LocalDataClient from '../clients/local-data';
import { AuthServiceClient } from '../clients/auth-service';
import die from '../extension/die';
import msg from '../user_messages';
import { ExtensionManagerClient } from '../clients/extension-manager';
import urls from '../../config/services';

function promptUserCredentials() {
  console.log(msg.login.credentialsPrompt(urls.appBuilder));
  const questions = [{
    name: 'username',
    message: 'Email',
  }, {
    name: 'password',
    message: 'Password',
    type: 'password',
  }];

  return inquirer.prompt(questions);
}

export async function loginUser() {
  /*
    Asks user to enter credentials, verifies those credentials with authentication
    service, and saves the received API token locally for further requests.
  */
  const authServiceClient = new AuthServiceClient();
  const localDataClient = new LocalDataClient();

  const creds  = await promptUserCredentials();
  const { username, password } = creds;
  const apiToken = await authServiceClient.loginUser(username, password);
  console.log(msg.login.loggedIn(creds));

  return await localDataClient.saveApiToken(apiToken);
}

export async function ensureUserIsLoggedIn() {
  /*
    If user is logged in, `callback` receives his/her current API token. Otherwise,
    user will be prompted to log in, and `callback` will receive a fresh token.

    Any error in this process is a show-stopper: for many (all?) commands, it
    makes no sense to continue if user cannot be authenticated.
  */
  const localDataClient = new LocalDataClient();

  try {
    const apiToken = await localDataClient.loadApiToken();

    if (apiToken) {
      const extManager = new ExtensionManagerClient(apiToken);
      try {
        await extManager.getDeveloper();
        return apiToken;
      } catch (err) {
      }
    }
    return await loginUser();
  } catch (err) {
    await die(err);
  }
}
