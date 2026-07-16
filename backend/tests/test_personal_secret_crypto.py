import unittest

from tests.support import prepare_backend_imports

prepare_backend_imports()

from app.services import personal_secret_crypto
from app.services.personal_secret_crypto import PersonalSecretCryptoError, decrypt_personal_secret, encrypt_personal_secret


class PersonalSecretCryptoTests(unittest.TestCase):
    def setUp(self) -> None:
        self.original_key = getattr(personal_secret_crypto.settings, "personal_secret_key", "")
        personal_secret_crypto.settings.personal_secret_key = "test-personal-secret-key-with-32-chars"

    def tearDown(self) -> None:
        personal_secret_crypto.settings.personal_secret_key = self.original_key

    def test_encrypt_decrypt_round_trip_with_aad(self) -> None:
        encrypted = encrypt_personal_secret("secret-value", aad="owner:1:password")

        self.assertIsNotNone(encrypted)
        assert encrypted is not None
        self.assertNotIn("secret-value", encrypted.cipher)
        self.assertEqual(decrypt_personal_secret(encrypted.cipher, encrypted.nonce, aad="owner:1:password"), "secret-value")

    def test_decrypt_rejects_wrong_aad(self) -> None:
        encrypted = encrypt_personal_secret("secret-value", aad="owner:1:password")

        self.assertIsNotNone(encrypted)
        assert encrypted is not None
        with self.assertRaises(PersonalSecretCryptoError):
            decrypt_personal_secret(encrypted.cipher, encrypted.nonce, aad="owner:2:password")
