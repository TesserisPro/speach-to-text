const IamTokenManagerV1 = require('watson-developer-cloud/iam-token-manager/v1');

let tokenManager;

class AuthService {
  static getToken({ api_key, serviceUrl }) {
    tokenManager = new IamTokenManagerV1.IamTokenManagerV1({
      iamApikey: api_key,
      iamUrl: serviceUrl,
    });
    return new Promise((resolve, reject) => {
      tokenManager.getToken((err, token) => {
        if (err) {
          reject(err);
        } else {
          const credentials = {
            accessToken: token,
            serviceUrl,
          };
          resolve(credentials);
        }
      });
    })

  }
}

export default AuthService;