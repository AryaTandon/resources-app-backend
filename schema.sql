create table resources (
	id serial primary key,
	title varchar(255) not null,
	author varchar(255),
	url text not null,
	description text 
);

create table recommendations (
	id integer not null,
	recommender varchar(255) not null,
	is_faculty boolean not null,
	mark_stage varchar(255),
	was_used boolean not null,
	constraint fk_resources foreign key(id) references resources(id)
);

create table resource_type (
	id integer not null,
	content_type varchar(255),
	constraint fk_resources foreign key(id) references resources(id)
);

create table resource_tags (
	id integer not null,
	cat_tags varchar(255),
	constraint fk_resources foreign key(id) references resources(id)
);


select * from recommendations;
select * from resource_type;
select * from resource_tags;
select * from resources;

insert into resources (title, url) values ('A Python primer', 'http://pythonprimer.co.uk');
insert into resources(title, author, url, description) values ('A JS primer', 'Codecademy', 'http://JSprimer.codecademy.co.uk', 'just a little introductory info to JS!');
insert into recommendations (id,recommender,is_faculty, was_used) values (2, 'Arya', false, true);
insert into resource_tags(id, cat_tags) values (28, 'JS');
insert into resource_type(id, content_type) values (28, 'Cheat sheet');