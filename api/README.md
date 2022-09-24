# nbc-api

**nbc-api** is is an **unofficial** [NBC](https://nbc.com) API.

## 🃏 Features

- Create and log in to accounts.
- Get direct link to any stream that your account has access to.

## 🚀 Example Usage

```js
import NBC from '@n0bodysec/nbc-api';

(async () =>
{
	const nbc = new NBC();
	const ret = await nbc.account.registerSimple('username', 'password');
	console.log('Returned data', ret.data);
})();
```

## 👍 Acknowledgements

- [NBCUniversal Media, LLC.](https://www.nbcuniversal.com/) - For their platform.

## 📜 License

Licensed under [MIT License](LICENSE.md).

## 📜 Notice

I am not affiliated with or endorsed by NBCUniversal Media, LLC. or any of its affiliates.
