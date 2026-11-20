// Escape user input before echoing it back in the summary table.
function escapeHtml(value) {
    return $("<div>").text(value || "").html();
}

$(document).ready(function () {

    $("#send_message").click(function (e) {

        e.preventDefault();

        let error = false;

        let name = $("input[name='name']").val().trim();
        let email = $("input[name='email']").val().trim();
        let phone = $("input[name='phone']").val().trim();
        let project = $("textarea[name='project_description']").val().trim();
        let type = $("select[name='project_type']").val();
        let budget = $("select[name='budget']").val();
        let timeline = $("select[name='timeline']").val();

        $(".form-control").removeClass("error_input");

        if (name === "") {
            $("input[name='name']").addClass("error_input");
            error = true;
        }

        if (email === "" || email.indexOf("@") === -1) {
            $("input[name='email']").addClass("error_input");
            error = true;
        }

        if (phone === "") {
            $("input[name='phone']").addClass("error_input");
            error = true;
        }

        if (project === "") {
            $("textarea[name='project_description']").addClass("error_input");
            error = true;
        }

        if (type === "") {
            $("select[name='project_type']").addClass("error_input");
            error = true;
        }

        if (budget === "") {
            $("select[name='budget']").addClass("error_input");
            error = true;
        }

        if (timeline === "") {
            $("select[name='timeline']").addClass("error_input");
            error = true;
        }

        if (!error) {

            $("#send_message")
                .prop("disabled", true)
                .val("Sending...");

            var payload = { type: "quote" };
            $.each($("#estimator-form").serializeArray(), function (_, field) {
                payload[field.name] = field.value;
            });

            $.ajax({
                url: "/api/messages",
                type: "POST",
                contentType: "application/json",
                data: JSON.stringify(payload),

                success: function (result) {

                    if (result && result.ok) {

                        var html = "";

                        html += '<table class="table table-bordered table-striped">';
                        html += "<tbody>";

                        html += "<tr><th width='250'>Name</th><td>" + escapeHtml($("input[name='name']").val()) + "</td></tr>";
                        html += "<tr><th>Email</th><td>" + escapeHtml($("input[name='email']").val()) + "</td></tr>";
                        html += "<tr><th>Phone</th><td>" + escapeHtml($("input[name='phone']").val()) + "</td></tr>";
                        html += "<tr><th>Company</th><td>" + escapeHtml($("input[name='company']").val()) + "</td></tr>";
                        html += "<tr><th>Project Description</th><td>" + escapeHtml($("textarea[name='project_description']").val()).replace(/\n/g, "<br>") + "</td></tr>";
                        html += "<tr><th>Project Type</th><td>" + escapeHtml($("select[name='project_type']").val()) + "</td></tr>";
                        html += "<tr><th>Property Size</th><td>" + escapeHtml($("select[name='property_size']").val()) + "</td></tr>";
                        html += "<tr><th>Estimated Budget</th><td>" + escapeHtml($("select[name='budget']").val()) + "</td></tr>";
                        html += "<tr><th>Project Timeline</th><td>" + escapeHtml($("select[name='timeline']").val()) + "</td></tr>";
                        html += "<tr><th>Preferred Style</th><td>" + escapeHtml($("select[name='style']").val()) + "</td></tr>";
                        html += "<tr><th>Preferred Start Date</th><td>" + escapeHtml($("input[name='start_date']").val()) + "</td></tr>";
                        html += "<tr><th>Project Address</th><td>" + escapeHtml($("input[name='address']").val()) + "</td></tr>";
                        html += "<tr><th>Special Requirements</th><td>" + escapeHtml($("textarea[name='requirements']").val()).replace(/\n/g, "<br>") + "</td></tr>";

                        html += "</tbody>";
                        html += "</table>";

                        $("#quote_summary").html(html);

                        // Hide form after successful submission
                        $("#form-wrapper").hide();

                        // Show success message
                        $("#quote_success")
                            .removeClass("d-none")
                            .hide()
                            .fadeIn(500);

                    } else {

                        alert("Failed to send your request. Please try again.");

                        $("#send_message")
                            .prop("disabled", false)
                            .val("Get Free Estimate");
                    }

                },

                error: function () {

                    alert("Unable to connect to the server.");

                    $("#send_message")
                        .prop("disabled", false)
                        .val("Get Free Estimate");
                }

            });

        }

    });

});