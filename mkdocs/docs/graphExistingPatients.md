The default operation of the Graph builder is to build graphs representing scenarios which are saved in an application database - and can be viewed by others. The resources in the graph can also be saved to a FHIR server, as described in the [Server interaction](graphServer.md) page. When they are saved in a FHIR server, they are just like any other resource instance there.

However there are situations where you want to 'share' resources across different graphs - and potentially different graphs from different users. To do this, you need to follow a specific process which is to 'connect' the graph with an existing patient in the server. When you do this, the other resources that reference that patient can be included in your graph - but they cannot be edited. It is quite possible for a single patient on the server to have resources created by different people, but only the creator can subsequeltly modify the resource.

There are a number of ways that this can be done.

##Existing patient
This describes the process where the patient - and other resources already exist on the server. This can be done by any number of users simultaneously (though note that the testing has not been thorough :) )

1. Create a new graph. It should be empty to start with.
2. Click the 'Select Patient' tab on the palette. There is a text box into which you can enter the patients name. Click the 'Search' link. The app will retrieve all patients with that name and display them in a list. Click the 'Select' link for the one you want. (Note that the search uses the Patient 'name' search parameter)

Once that has happened, the patient is added to the graph with a category of 'core (linked)'. Because it was not created in this graph it cannot be modified - though it can be on the server. If you select it in the graph, the editor will show only the Json contents.

However, if you select the 'Core resource types' tab in the palette, you's see a new link - 'Select from patient'. Clicking that link will display a dialog with all the existing resources for the linked patient on the data server. You can select any of them and they will be added to the graph (again, as linked resources - not editable).

You can create other resources in the graph in the usual way and create references from them to the patient (or any of the other linked resources) which can then be saved to the server and used by others. You can continue to update them - though the others will not be able to of course. 

Note that the 'master' version of the resource is held in the graph. This means that if the copy on the FHIR server is modified, those changes will be lost the next time that the graph is updated.




##New patient 
If the patient does not already exist, then it should be created by one of the users first. After that, other resources can be added in the usual way.


