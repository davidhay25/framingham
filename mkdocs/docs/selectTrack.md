



## Tracks

Each event can have any number of tracks defined for it. Anyone can create a track - if they make themselves a track lead, then only they can edit it. There are 3 different types of track:

* Technical tracks are used to record the outcome of testing between a client and a server.
* Logical model tracks are used to enter data for a single Logical Model (which must be created by the clinFHIR Logical modeller).
* Resource Graph tracks are used to create graphs of resources (or resource webs) that represent a single scenario

Events can be configured to only have a single type of track or any type. If more than one type is suppoered by an event, there is a set of buttons above the tracklist that can be used to show only a single type of track.

A tracks is selected by clicking on it in the list to the left. Details about that track will appear to the right, and a number of tabswill be displayed at the top of the screen (the tabs that appear depend on the track type).

### Track Servers

When the track is created of type *Resource Graph*, the FHIR servers that it uses are selected. There are 3 servers for each track:

* The **Conformance** server holds the resource type definitions and profiles (as StructureDefinition resources)
* The **Data** server is where the resources in the graph can be saved (The graphs themselves are saved in a separate database). Server interaction is descibed on a separate page.
* The **Terminology** server supports the terminology operations that are required - specifically the *$expand* operation that displays the contents of a ValueSet. The ValueSets themselves and any associated CodeSystem resources must also be stored on the Terminology server.

##Scenarios
