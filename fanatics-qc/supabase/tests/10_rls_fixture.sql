grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage on all sequences in schema public to authenticated;
grant select, insert, delete on storage.objects to authenticated;
insert into auth.users values ('00000000-0000-0000-0000-00000000000a','admin@x'),('00000000-0000-0000-0000-00000000000b','a@x'),('00000000-0000-0000-0000-00000000000c','b@x');
insert into suppliers (id,name,code) values ('11111111-1111-1111-1111-111111111111','Sup A','SUPA'),('22222222-2222-2222-2222-222222222222','Sup B','SUPB');
insert into profiles (id,email,role,supplier_id) values ('00000000-0000-0000-0000-00000000000a','admin@x','admin',null),('00000000-0000-0000-0000-00000000000b','a@x','supplier','11111111-1111-1111-1111-111111111111'),('00000000-0000-0000-0000-00000000000c','b@x','supplier','22222222-2222-2222-2222-222222222222');
insert into fabrics (id,supplier_id,code,name,fiber) values ('aaaaaaaa-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','FA','Fab A','polyester'),('bbbbbbbb-0000-0000-0000-000000000001','22222222-2222-2222-2222-222222222222','FB','Fab B','cotton');
insert into lots (id,fabric_id,lot_number) values ('cccccccc-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000001','LB1');
