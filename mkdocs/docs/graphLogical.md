##Using clinFHIR logical models in the graph builder
The graph builder can also build 'pseudo' resource instances from logical models that have been created using the clinFHIR Logical Modeller. These are useful if you create the models from core resource types and add elements to the models to represent extensions. You can then 'test' out the models in the Graph Builder, and subsequently create the real profiles.

**These *pseudo* resources cannot be saved on the data server**

Using logical models in this way requires specific setup of the scenario.

###Setup

1. Select the track, and note the conformance server.
2. Open clinfhir and set the conformance server to the same server
3. Load the clinFHIR Logical modeller and create the model, giving it a name that you will recognize later. You can model it on a core resource type or just use an ad hoc model. Make a note of the Model Url (found in the **Model** tab on the right.
4. In conMan, create a new scenario in the track (or select an existing one) and select the 'types' tab. The logical model can be added at the bottom of the dialog - click the + icon to display a dialog that will allow you to select the logical model you created.
5. Save the scenario.

After this, the logical model will be available to select from the Logical Models tab in the palette of the graph builder. You can either select from the dropdown (which can be quite difficult if there are a lot of models) or just enter the url to the model that you noted in step 3 above.

###Notes

You can use a logical model from another server if you wish.

1. In the clinFHIR logical modeler make a note of the full url to the modelas described in step3 above.
2. Then, just add to the scenario as described in step 4.