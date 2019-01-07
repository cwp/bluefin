create schema if not exists bluefin;

create table bluefin."{{table}}" (
  ordinal integer not null,
  name text not null,
  applied timestamp not null default now()
);
