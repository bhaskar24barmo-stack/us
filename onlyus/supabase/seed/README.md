Provision the two accounts (run in the Supabase SQL editor, BEFORE creating the auth users):

insert into approved_users (email, display_name) values
  ('you@example.com', 'You'), ('her@example.com', 'Her');

Then create each user in Dashboard > Authentication > Users > "Add user" (set password, mark confirmed).
A third insert into approved_users, or a third auth user, will be rejected by the database.
