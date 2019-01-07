{{#has.roles}}
revoke all on database {{database}} from {{roleNames}};
{{/has.roles}}
{{#has.schemas}}
revoke all on schema {{schemaNames}} from {{roleNames}};
revoke all on all tables in schema {{schemaNames}} from {{roleNames}};
revoke all on all sequences in schema {{schemaNames}} from {{roleNames}};
revoke all on all functions in schema {{schemaNames}} from {{roleNames}};
{{/has.schemas}}
{{#has.domains}}
revoke all on domain {{domainNames}} from {{roleNames}};
{{/has.domains}}
{{#has.foreignDataWrappers}}
revoke all on foreign data wrapper {{foreignDataWrapperNames}} from {{roleNames}};
{{/has.foreignDataWrappers}}
{{#has.foreignServers}}
revoke all on foreign server {{foreignServerNames}} from {{roleNames}};
{{/has.foreignServers}}
{{#has.tablespaces}}
revoke all on tablespace {{tablespaceNames}} from {{roleNames}};
{{/has.tablespaces}}
{{#has.types}}
revoke all on type {{typeNames}} from {{roleNames}};
{{/has.types}}
