{{#has.schemas}}
drop schema {{schemaNames}} cascade;
{{/has.schemas}}
{{#has.foreignDataWrappers}}
drop foreign data wrapper {{foreignDataWrapperNames}} cascade;
{{/has.foreignDataWrappers}}
{{#has.foreignServers}}
drop server {{foreignServerNames}} cascade;
{{/has.foreignServers}}
{{#has.types}}
drop type {{typeNames}} cascade;
{{/has.types}}
