import unittest

from pydantic import ValidationError

from app.schemas.personal_secrets import PersonalSecretCreate, PersonalSecretUpdate


class PersonalSecretSchemaTests(unittest.TestCase):
    def test_create_allows_missing_username_and_password(self) -> None:
        payload = PersonalSecretCreate(system_name=" Example ")

        self.assertEqual(payload.system_name, "Example")
        self.assertIsNone(payload.username)
        self.assertIsNone(payload.password)

    def test_create_normalizes_blank_username_and_password(self) -> None:
        payload = PersonalSecretCreate(system_name="Example", username="  ", password="  ")

        self.assertIsNone(payload.username)
        self.assertIsNone(payload.password)

    def test_update_can_clear_password(self) -> None:
        payload = PersonalSecretUpdate(password="")

        self.assertIsNone(payload.password)
        self.assertIn("password", payload.model_fields_set)

    def test_create_still_requires_system_name(self) -> None:
        with self.assertRaises(ValidationError):
            PersonalSecretCreate(system_name="  ")


if __name__ == "__main__":
    unittest.main()
