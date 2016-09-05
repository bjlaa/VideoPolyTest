class VideoController < ApplicationController
	def show
	end

	def create
		book = Book.find(params[:book_id])
		if book.present?
			authorize book
			book.phrase_pairs.create(create_or_update_params)
			render json: {}, status: :ok
		else
			skip_authorization
			render json: {}, status: 422
		end
	end

	private

	def create_or_update_params
		params.require(:phrase_pairs).permit(:target_phrase, :source_phrase)
	end
	
end